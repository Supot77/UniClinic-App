-- Add date-windowed variants for the Notification page.
-- The original one-argument RPCs remain available for existing callers.

CREATE OR REPLACE FUNCTION public.get_broadcast_history(
  p_limit integer,
  p_start_at timestamp with time zone,
  p_end_at timestamp with time zone
)
RETURNS TABLE(
  id uuid,
  title text,
  message text,
  sent_at timestamp with time zone,
  recipient_count bigint,
  read_count bigint,
  role_read_counts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'staff_admin'
      AND profile.is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Only active staff_admin users can view Broadcast history'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    broadcast.id,
    broadcast.title,
    broadcast.message,
    broadcast.sent_at,
    count(notification.id) AS recipient_count,
    count(notification.id) FILTER (WHERE notification.read_at IS NOT NULL) AS read_count,
    jsonb_build_object(
      'patient', jsonb_build_object(
        'read', count(notification.id) FILTER (WHERE profile.role = 'patient' AND notification.read_at IS NOT NULL),
        'total', count(notification.id) FILTER (WHERE profile.role = 'patient')
      ),
      'medical', jsonb_build_object(
        'read', count(notification.id) FILTER (WHERE profile.role = 'medical' AND notification.read_at IS NOT NULL),
        'total', count(notification.id) FILTER (WHERE profile.role = 'medical')
      ),
      'staff_admin', jsonb_build_object(
        'read', count(notification.id) FILTER (WHERE profile.role = 'staff_admin' AND notification.read_at IS NOT NULL),
        'total', count(notification.id) FILTER (WHERE profile.role = 'staff_admin')
      )
    ) AS role_read_counts
  FROM public.broadcasts AS broadcast
  LEFT JOIN public.notifications AS notification
    ON notification.broadcast_id = broadcast.id
  LEFT JOIN public.profiles AS profile
    ON profile.id = notification.user_id
  WHERE (p_start_at IS NULL OR broadcast.sent_at >= p_start_at)
    AND (p_end_at IS NULL OR broadcast.sent_at <= p_end_at)
  GROUP BY broadcast.id, broadcast.title, broadcast.message, broadcast.sent_at
  ORDER BY broadcast.sent_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END
$function$;

REVOKE ALL ON FUNCTION public.get_broadcast_history(integer, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_broadcast_history(integer, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unread_notification_recipients(
  p_limit integer,
  p_start_at timestamp with time zone,
  p_end_at timestamp with time zone
)
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
    AND (p_start_at IS NULL OR notification.created_at >= p_start_at)
    AND (p_end_at IS NULL OR notification.created_at <= p_end_at)
  ORDER BY notification.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$function$;

REVOKE ALL ON FUNCTION public.get_unread_notification_recipients(integer, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_recipients(integer, timestamp with time zone, timestamp with time zone) TO authenticated;
