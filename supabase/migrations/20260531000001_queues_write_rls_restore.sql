-- Restaura políticas de escrita em queues (produção tinha só SELECT + service_role bypass).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'queues' AND policyname = 'queues_insert_by_company'
  ) THEN
    CREATE POLICY "queues_insert_by_company" ON public.queues FOR INSERT
      WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'queues' AND policyname = 'queues_update_by_company'
  ) THEN
    CREATE POLICY "queues_update_by_company" ON public.queues FOR UPDATE
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'queues' AND policyname = 'queues_delete_by_company'
  ) THEN
    CREATE POLICY "queues_delete_by_company" ON public.queues FOR DELETE
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;
