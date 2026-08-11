-- Add reminder_sent_at column to adopter_applications
ALTER TABLE public.adopter_applications ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Update get_dnr_applications to use reminder_sent_at
CREATE OR REPLACE FUNCTION public.get_dnr_applications()
 RETURNS TABLE(app_uuid uuid, app_monday_id text, matched_adoptee text, formerly_adopted boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
SELECT
  apps.app_uuid,
  apps.monday_id,
  apps.matched_adoptee,
  adoptees.formerly_adopted
FROM public.adopter_applications AS apps
LEFT JOIN public.adoptee_vector AS adoptees ON apps.matched_adoptee = adoptees.id
WHERE apps.waiting_confirmation = true 
  AND apps.reminder_sent_at IS NOT NULL 
  AND apps.reminder_sent_at + interval '7 days' < NOW();
$function$;
