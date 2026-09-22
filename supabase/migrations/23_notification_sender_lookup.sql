-- Allow a recipient to see the safe sender identity for their own broadcast notifications.
-- Direct profile reads remain restricted by the existing RLS policies.
CREATE OR REPLACE FUNCTION public.get_notification_senders(p_notification_ids uuid[])
RETURNS TABLE(
  notification_id uuid,
  sender_name text,
  sender_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    notification.id,
    concat_ws(' ', nullif(btrim(profile.title), ''), nullif(btrim(profile.first_name), ''), nullif(btrim(profile.last_name), '')),
    profile.role::text
  FROM public.notifications AS notification
  JOIN public.broadcasts AS broadcast
    ON broadcast.id = notification.broadcast_id
  JOIN public.profiles AS profile
    ON profile.id = broadcast.sent_by
  WHERE auth.uid() IS NOT NULL
    AND notification.user_id = auth.uid()
    AND notification.type = 'broadcast'
    AND notification.deleted_at IS NULL
    AND notification.id = ANY(COALESCE(p_notification_ids, ARRAY[]::uuid[]));
$function$;

REVOKE ALL ON FUNCTION public.get_notification_senders(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_senders(uuid[]) TO authenticated;
