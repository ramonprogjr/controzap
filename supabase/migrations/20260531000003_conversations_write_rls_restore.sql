-- Restaura políticas de escrita em conversations (produção tinha só SELECT + service_role bypass).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_insert_by_company'
  ) THEN
    CREATE POLICY "conversations_insert_by_company" ON public.conversations FOR INSERT
      WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_update_by_company'
  ) THEN
    CREATE POLICY "conversations_update_by_company" ON public.conversations FOR UPDATE
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_delete_by_company'
  ) THEN
    CREATE POLICY "conversations_delete_by_company" ON public.conversations FOR DELETE
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;
