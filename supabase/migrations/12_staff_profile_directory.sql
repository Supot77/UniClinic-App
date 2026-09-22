-- Staff-only directory of account contact details.
-- Email lives in auth.users, so the browser reads it through this guarded RPC.

CREATE OR REPLACE FUNCTION public.get_staff_profile_directory()
RETURNS TABLE(
  id uuid,
  display_name text,
  title text,
  first_name text,
  last_name text,
  email text,
  phone text,
  role text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles AS actor
    WHERE actor.id = auth.uid()
      AND actor.role = 'staff_admin'
      AND actor.is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Only staff_admin users can view the account directory'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    profile.id::uuid,
    concat_ws(' ', nullif(btrim(profile.title), ''), nullif(btrim(profile.first_name), ''), nullif(btrim(profile.last_name), ''))::text,
    profile.title::text,
    profile.first_name::text,
    profile.last_name::text,
    account.email::text,
    profile.phone::text,
    profile.role::text,
    profile.is_active::boolean
  FROM public.profiles AS profile
  JOIN auth.users AS account ON account.id = profile.id
  ORDER BY profile.role, profile.first_name, profile.last_name;
END
$function$;

REVOKE ALL ON FUNCTION public.get_staff_profile_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_profile_directory() TO authenticated;
