-- Migration: Add "How did you hear about us?" columns to adopter_profiles
-- Created at: 2026-08-05 21:50:00

ALTER TABLE public.adopter_profiles 
ADD COLUMN IF NOT EXISTS how_did_you_hear TEXT,
ADD COLUMN IF NOT EXISTS how_did_you_hear_other TEXT;

-- Update get_user_and_application to include the new columns
DROP FUNCTION IF EXISTS public.get_user_and_application(uuid);
DROP FUNCTION IF EXISTS public.get_user_and_application(text);

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
  veteran_status boolean,
  how_did_you_hear text,
  how_did_you_hear_other text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.age_pref::integer[],
    p.date_of_birth::text,
    a.exported_to_monday::boolean,
    p.first_name::text,
    a.gender_pref::text,
    p.gender::text,
    p.last_name::text,
    p.monday_id::text,
    a.personal_bio::text,
    p.pronouns::text,
    a.ranked_cards::text[],
    p.state::text,
    p.user_id::uuid,
    p.veteran_status::boolean,
    p.how_did_you_hear::text,
    p.how_did_you_hear_other::text
  FROM public.adopter_applications a
  JOIN public.adopter_profiles p ON a.adopter_uuid = p.user_id
  WHERE a.app_uuid = app_id;
END;
$$;
