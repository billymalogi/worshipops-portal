-- ============================================================
-- WorshipOps: Clean up leads table RLS policies
--
-- Diagnostics showed anon INSERT already worked fine via a
-- pre-existing "Allow public to insert leads" policy (my earlier
-- "public_insert_leads" policy was an unnecessary duplicate).
--
-- The real bug: "Allow only admins to view leads" checked against
-- a literal placeholder email ('your-email@gmail.com') that was
-- never replaced with a real account, so no one could ever view
-- leads through RLS-scoped access. Removing the broken policy and
-- the redundant insert policy; keeping admins_read_leads (which
-- checks real org-admin membership) and the original insert policy.
-- ============================================================

DROP POLICY IF EXISTS "Allow only admins to view leads" ON leads;
DROP POLICY IF EXISTS "public_insert_leads" ON leads;
