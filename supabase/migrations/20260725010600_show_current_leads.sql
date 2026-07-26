DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, phone, first_name, last_name, church_name, email, created_at FROM leads ORDER BY created_at
  LOOP
    RAISE NOTICE 'LEAD % | phone=% | first_name=% | last_name=% | church=% | email=% | created=%',
      r.id, r.phone, r.first_name, r.last_name, r.church_name, r.email, r.created_at;
  END LOOP;
END $$;
