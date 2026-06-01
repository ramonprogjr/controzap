-- Restaura políticas de escrita em channels (produção tinha só SELECT + service_role bypass).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'channels' AND policyname = 'channels_insert_by_company'
  ) THEN
    CREATE POLICY "channels_insert_by_company" ON public.channels FOR INSERT
      WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'channels' AND policyname = 'channels_update_by_company'
  ) THEN
    CREATE POLICY "channels_update_by_company" ON public.channels FOR UPDATE
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'channels' AND policyname = 'channels_delete_by_company'
  ) THEN
    CREATE POLICY "channels_delete_by_company" ON public.channels FOR DELETE
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;
