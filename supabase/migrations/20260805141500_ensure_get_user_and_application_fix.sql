-- Migration: Ensure get_user_and_application pulls personal_bio from adopter_applications
-- and fix veteran_tatus typo in get_adoptee_with_facility
-- Created at: 2026-08-05 14:20:00

CREATE OR REPLACE FUNCTION public.get_user_and_application(app_id uuid)
RETURNS TABLE (
  age_pref integer[],
  date_of_birth text,
  exported_to_monday boolean,
  first_name text,
  gender_pref text,
  gender text,
  last_name text,
  monday_id text,
  personal_bio text,
  pronouns text,
  ranked_cards text[],
  state text,
  user_id uuid,
  veteran_status boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.age_pref,
    p.date_of_birth,
    a.exported_to_monday,
    p.first_name,
    a.gender_pref,
    p.gender,
    p.last_name,
    p.monday_id,
    a.personal_bio,
    p.pronouns,
    a.ranked_cards,
    p.state,
    p.user_id,
    p.veteran_status
  FROM adopter_applications a
  JOIN adopter_profiles p ON a.adopter_uuid = p.user_id
  WHERE a.app_uuid = app_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_adoptee_with_facility(adoptee_id text)
 RETURNS TABLE(id text, personal_bio text, gender text, veteran_status text, offense text, state text, first_name text, last_name text, dob date, inmate_id text, status adoptee_status, formerly_adopted boolean, facility_name text, mailing_address text, system text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select 
    adoptee.id,
    adoptee.bio as personal_bio,
    adoptee.gender,
    adoptee.veteran_status,
    adoptee.offense,
    adoptee.state,
    adoptee.first_name,
    adoptee.last_name,
    adoptee.dob,
    adoptee.inmate_id,
    adoptee.status,
    adoptee.formerly_adopted,
    facility_name,
    mailing_address,
    system
  from public.adoptee_vector as adoptee
  left join public.adoptee_facilities as facilities
    on facilities.facility_id = adoptee.facility_id
  where adoptee.id = adoptee_id
$function$;
