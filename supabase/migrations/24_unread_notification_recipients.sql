-- Return unread broadcast recipients to active staff admins only.
-- The function exposes the minimum fields needed for the admin notification summary.
CREATE OR REPLACE FUNCTION public.get_unread_notification_recipients(p_limit integer DEFAULT 100)
RETURNS TABLE(
  notification_id uuid,
  user_id uuid,
  display_name text,
  role text,
  title text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    notification.id,
    notification.user_id,
    concat_ws(' ', nullif(btrim(profile.title), ''), nullif(btrim(profile.first_name), ''), nullif(btrim(profile.last_name), '')),
    profile.role::text,
    notification.title,
    notification.created_at
  FROM public.notifications AS notification
  JOIN public.profiles AS profile
    ON profile.id = notification.user_id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS actor
      WHERE actor.id = auth.uid()
        AND actor.role = 'staff_admin'
        AND actor.is_active IS DISTINCT FROM false
    )
    AND notification.type = 'broadcast'
    AND notification.read_at IS NULL
    AND notification.deleted_at IS NULL
  ORDER BY notification.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$function$;

REVOKE ALL ON FUNCTION public.get_unread_notification_recipients(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_recipients(integer) TO authenticated;
