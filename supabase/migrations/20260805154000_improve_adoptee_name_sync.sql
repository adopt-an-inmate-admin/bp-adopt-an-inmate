-- Migration: Improve adoptee_name sync trigger to be more robust and handle inserts
-- Created at: 2026-08-05 15:40:00

CREATE OR REPLACE FUNCTION public.sync_matched_adoptee_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- If matched_adoptee is NULL, clear the name
  IF NEW.matched_adoptee IS NULL THEN
    NEW.adoptee_name := NULL;
  ELSE
    -- If it's an INSERT or matched_adoptee has changed, or adoptee_name is NULL but we have an ID
    IF TG_OP = 'INSERT' OR 
       (TG_OP = 'UPDATE' AND (NEW.matched_adoptee IS DISTINCT FROM OLD.matched_adoptee OR NEW.adoptee_name IS NULL))
    THEN
      SELECT NULLIF(trim(concat_ws(' ', first_name, last_name)), '')
      INTO NEW.adoptee_name
      FROM public.adoptee_vector
      WHERE id = NEW.matched_adoptee;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger to include INSERT
DROP TRIGGER IF EXISTS trigger_sync_matched_adoptee_name ON public.adopter_applications;

CREATE TRIGGER trigger_sync_matched_adoptee_name 
BEFORE INSERT OR UPDATE ON public.adopter_applications 
FOR EACH ROW EXECUTE FUNCTION sync_matched_adoptee_name();
