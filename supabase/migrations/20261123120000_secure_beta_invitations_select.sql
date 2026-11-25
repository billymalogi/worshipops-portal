-- ============================================================
-- WorshipOps: Replace public bulk-readable beta_invitations
-- policy with a token-scoped RPC lookup.
--
-- The old "public_read_invitation_by_token" policy was
-- USING (true), which let anyone with the anon key list every
-- row in the table (GET /rest/v1/beta_invitations?select=*),
-- leaking invited emails and every unused invite token. The
-- invite page only ever needs to look up the one row matching
-- a token it already has, so swap that for a SECURITY DEFINER
-- function that returns at most one row for an exact token
-- match instead of exposing the whole table.
-- ============================================================

DROP POLICY IF EXISTS "public_read_invitation_by_token" ON beta_invitations;

CREATE OR REPLACE FUNCTION get_beta_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  invited_email text,
  used_at timestamptz,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, invited_email, used_at, is_active
  FROM beta_invitations
  WHERE token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_beta_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_beta_invitation_by_token(text) TO anon, authenticated;
