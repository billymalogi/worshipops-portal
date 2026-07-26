DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, permissive, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leads'
  LOOP
    RAISE NOTICE 'POLICY % | % | cmd=% | using=% | check=%',
      pol.policyname, pol.permissive, pol.cmd, pol.qual, pol.with_check;
  END LOOP;
END $$;
