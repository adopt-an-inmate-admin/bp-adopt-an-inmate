-- Migration: Fix get_user_and_application to pull personal_bio from adopter_applications
-- Created at: 2026-08-04 19:14:00

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
