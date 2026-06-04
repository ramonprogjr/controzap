-- Alinha schema com produção: messages.company_id NOT NULL para RLS/realtime por tenant.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.messages m
SET company_id = c.company_id
FROM public.conversations c
WHERE m.conversation_id = c.id
  AND m.company_id IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_company_conversation_sent
  ON public.messages(company_id, conversation_id, sent_at DESC);

COMMENT ON COLUMN public.messages.company_id IS 'Tenant; espelha conversations.company_id para inserts diretos e RLS.';
