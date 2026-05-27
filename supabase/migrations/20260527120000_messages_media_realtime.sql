-- Expand messages for professional chat (media, dedupe, realtime)

-- Drop old message_type constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- New columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS transcription text,
  ADD COLUMN IF NOT EXISTS external_id text;

-- Expanded message types
ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document', 'sticker', 'media'));

-- Dedupe webhook replays
CREATE UNIQUE INDEX IF NOT EXISTS messages_company_external_id_idx
  ON public.messages (company_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON public.messages (company_id, lead_id, direction)
  WHERE read_at IS NULL AND direction = 'inbound';

-- Realtime for instant conversas updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/webm',
    'video/mp4', 'video/webm',
    'application/pdf', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read for chat media (paths include company_id)
DROP POLICY IF EXISTS "chat_media_public_read" ON storage.objects;
CREATE POLICY "chat_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_service_upload" ON storage.objects;
CREATE POLICY "chat_media_service_upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_authenticated_upload" ON storage.objects;
CREATE POLICY "chat_media_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
  );
