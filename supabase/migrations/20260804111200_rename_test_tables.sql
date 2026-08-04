-- Migration: Rename test tables to production names
-- Created at: 2026-08-04 11:12:00

-- 1. Drop the existing (old/unused) adoptee_vector table.
DROP TABLE IF EXISTS public.adoptee_vector;

-- 2. Rename adoptee_vector_test to adoptee_vector.
ALTER TABLE public.adoptee_vector_test RENAME TO adoptee_vector;

-- 3. Rename adopter_applications_dummy to adopter_applications.
ALTER TABLE public.adopter_applications_dummy RENAME TO adopter_applications;

-- 4. Update foreign keys and indices for adoptee_vector (previously adoptee_vector_test)
ALTER TABLE public.adoptee_vector RENAME CONSTRAINT adoptee_vector_test_facility_id_fkey TO adoptee_vector_facility_id_fkey;
ALTER INDEX IF EXISTS public.adoptee_vector_test_pkey RENAME TO adoptee_vector_pkey;

-- 5. Update foreign keys and indices for adopter_applications (previously adopter_applications_dummy)
ALTER TABLE public.adopter_applications RENAME CONSTRAINT adopter_applications_dummy_adopter_uuid_fkey TO adopter_applications_adopter_uuid_fkey;
ALTER INDEX IF EXISTS public.adopter_applications_dummy_pkey RENAME TO adopter_applications_pkey;

-- 6. Update SQL functions

-- Update find_top_k_filtered_new
CREATE OR REPLACE FUNCTION public.find_top_k_filtered_new(
  query_embedding vector(384),
  k integer,
  adopter_gender text DEFAULT NULL,
  adopter_veteran_status text DEFAULT NULL,
  adopter_state text DEFAULT NULL,
  adopter_age_pref integer[] DEFAULT NULL
)
RETURNS TABLE (
  id text,
  first_name text,
  last_name text,
  bio text,
  gender text,
  state text,
  veteran_status text,
  age integer,
  embedding vector,
  similarity float
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  age_lo int;
  age_hi int;

  has_age boolean := adopter_age_pref IS NOT NULL
    AND cardinality(adopter_age_pref) >= 2;

  has_gender boolean := adopter_gender IS NOT NULL AND trim(adopter_gender) <> '';
  has_state  boolean := adopter_state IS NOT NULL AND trim(adopter_state) <> '';
  has_vet    boolean := adopter_veteran_status IS NOT NULL AND trim(adopter_veteran_status) <> '';

  lvl    int;
  winner int := 4;
  cnt    int;
BEGIN
  IF has_age THEN
    age_lo := adopter_age_pref[1];
    age_hi := adopter_age_pref[2];
  END IF;

  FOR lvl IN 0..4 LOOP
    SELECT count(*)::int INTO cnt
    FROM adoptee_vector t
    WHERE t.embedding IS NOT NULL
      AND t.dob IS NOT NULL
      AND t.status = 'WAIT_LISTED'::adoptee_status
      AND (NOT has_age    OR lvl >= 4 OR EXTRACT(YEAR FROM age(current_date, t.dob::date))::int BETWEEN age_lo AND age_hi)
      AND (NOT has_gender OR lvl >= 3 OR lower(trim(t.gender)) = lower(trim(adopter_gender)))
      AND (NOT has_state  OR lvl >= 2 OR lower(trim(t.state))  = lower(trim(adopter_state)))
      AND (NOT has_vet    OR lvl >= 1 OR lower(trim(coalesce(t.veteran_status, ''))) = lower(trim(adopter_veteran_status)));

    IF cnt >= k THEN
      winner := lvl;
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT
    t.id,
    t.first_name,
    t.last_name,
    t.bio,
    t.gender,
    t.state,
    t.veteran_status,
    EXTRACT(YEAR FROM age(current_date, t.dob::date))::int AS age,
    t.embedding,
    (1 - (t.embedding <=> query_embedding))::float AS similarity
  FROM adoptee_vector t
  WHERE t.embedding IS NOT NULL
    AND t.dob IS NOT NULL
    AND t.status = 'WAIT_LISTED'::adoptee_status
    AND (NOT has_age    OR winner >= 4 OR EXTRACT(YEAR FROM age(current_date, t.dob::date))::int BETWEEN age_lo AND age_hi)
    AND (NOT has_gender OR winner >= 3 OR lower(trim(t.gender)) = lower(trim(adopter_gender)))
    AND (NOT has_state  OR winner >= 2 OR lower(trim(t.state))  = lower(trim(adopter_state)))
    AND (NOT has_vet    OR winner >= 1 OR lower(trim(coalesce(t.veteran_status, ''))) = lower(trim(adopter_veteran_status)))
  ORDER BY similarity DESC
  LIMIT k;
END;
$$;

-- Update get_user_and_application
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
    p.personal_bio,
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
