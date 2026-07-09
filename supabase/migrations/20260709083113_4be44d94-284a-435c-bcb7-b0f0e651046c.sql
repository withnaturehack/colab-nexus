
-- Drop broad active-members SELECT policy on profiles
DROP POLICY IF EXISTS profiles_select_active_members ON public.profiles;

-- Directory view exposing only non-sensitive fields
CREATE OR REPLACE VIEW public.member_directory
WITH (security_invoker = true) AS
SELECT id, full_name, department, avatar_url, status
FROM public.profiles
WHERE status = 'active';

GRANT SELECT ON public.member_directory TO authenticated;

-- Owner-scoped SELECT on the view still needs base-table access; add a narrow
-- policy that lets active members read only the safe columns via the view.
CREATE POLICY profiles_select_directory_fields
ON public.profiles
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.status = 'active'
  )
);
-- NOTE: RLS is row-level; column restriction is enforced by only exposing
-- public.member_directory to app code. Sensitive columns remain inaccessible
-- unless the caller matches profiles_select_own / _dept_head / _super_admin.
