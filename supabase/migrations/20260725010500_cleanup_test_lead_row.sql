-- Remove the test row inserted while verifying the leads RLS fix
DELETE FROM leads WHERE email = 'schema-test@example.com';
