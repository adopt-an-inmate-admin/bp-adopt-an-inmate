-- Migration: Rename test tables to production names and update all referencing functions
-- Created at: 2026-08-04 11:12:00

-- 1. Drop the existing (old/unused) tables to avoid name conflicts
DROP TABLE IF EXISTS public.adoptee_vector CASCADE;
DROP TABLE IF EXISTS public.adopter_applications CASCADE;
DROP TABLE IF EXISTS vecs.adoptee_vector CASCADE;

-- 2. Rename test tables to production names
ALTER TABLE public.adoptee_vector_test RENAME TO adoptee_vector;
ALTER TABLE public.adopter_applications_dummy RENAME TO adopter_applications;
ALTER TABLE vecs.adoptee_vector_test RENAME TO adoptee_vector;

-- 3. Update foreign keys and indices for public.adoptee_vector
ALTER TABLE public.adoptee_vector RENAME CONSTRAINT adoptee_vector_test_facility_id_fkey TO adoptee_vector_facility_id_fkey;
ALTER INDEX IF EXISTS public.adoptee_vector_test_pkey RENAME TO adoptee_vector_pkey;

-- 4. Update foreign keys and indices for public.adopter_applications
ALTER TABLE public.adopter_applications RENAME CONSTRAINT adopter_applications_dummy_adopter_uuid_fkey TO adopter_applications_adopter_uuid_fkey;
ALTER INDEX IF EXISTS public.adopter_applications_dummy_pkey RENAME TO adopter_applications_pkey;

-- 5. Update SQL functions to reference the new table names

-- Drop functions first to avoid "cannot change return type" errors
DROP FUNCTION IF EXISTS public.find_top_k(vector, integer);
DROP FUNCTION IF EXISTS public.sync_matched_adoptee_name();
DROP FUNCTION IF EXISTS public.get_dnr_applications();
DROP FUNCTION IF EXISTS public.vec_transfer();
DROP FUNCTION IF EXISTS public.find_top_k_filtered(vector, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_adoptee_with_facility(text);
DROP FUNCTION IF EXISTS public.transfer_tables();
DROP FUNCTION IF EXISTS public.find_top_k_filtered_new(vector, integer, text, text, text, integer[]);
DROP FUNCTION IF EXISTS public.get_user_and_application(uuid);

-- FUNCTION: find_top_k
CREATE OR REPLACE FUNCTION public.find_top_k(query_embedding vector, k integer)
 RETURNS TABLE(id text, first_name text, last_name text, state text, dob date, gender text, bio text, embedding vector, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select 
    adoptee_vector.id,
    adoptee_vector.first_name,
    adoptee_vector.last_name,
    adoptee_vector.state,
    adoptee_vector.dob,
    adoptee_vector.gender,
    adoptee_vector.bio,
    adoptee_vector.embedding,
    1 - (adoptee_vector.embedding <=> query_embedding) as similarity
  from public.adoptee_vector
  order by adoptee_vector.embedding <=> query_embedding
  limit k;
$function$;

-- FUNCTION: sync_matched_adoptee_name
CREATE OR REPLACE FUNCTION public.sync_matched_adoptee_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  adoptee_name text;
BEGIN
  -- update adoptee name using matched adoptee id
  SELECT first_name || ' ' || last_name
  INTO adoptee_name
  FROM public.adoptee_vector AS adoptees
  WHERE adoptees.id = NEW.matched_adoptee;

  NEW.adoptee_name = adoptee_name;

  RETURN NEW;
END;
$function$;

-- FUNCTION: get_dnr_applications
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
WHERE apps.waiting_confirmation = true AND apps.time_confirmation_due < NOW();
$function$;

-- FUNCTION: vec_transfer
CREATE OR REPLACE FUNCTION public.vec_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.adoptee_vector (id, inmate_id, embedding, first_name, Last_name, bio, gender, dob, veteran_status, offense, state, formerly_adopted)
  SELECT
    id,
    metadata->>'inmate_id',
    vec AS embedding,
    metadata->>'first_name',
    metadata->>'last_name',
    metadata->>'bio',
    metadata->>'gender',
    to_date((metadata->>'dob'), 'YYYY-MM-DD'),
    metadata->>'veteran_status',
    metadata->>'offense',
    metadata->>'state',
    COALESCE((metadata->>'formerly_adopted')::boolean, false)
  FROM vecs.adoptee_vector
  ON CONFLICT (id) DO UPDATE SET
    embedding = EXCLUDED.embedding,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.Last_name,
    bio = EXCLUDED.bio,
    gender = EXCLUDED.gender,
    dob = EXCLUDED.dob,
    veteran_status = EXCLUDED.veteran_status,
    offense = EXCLUDED.offense,
    state = EXCLUDED.state,
    formerly_adopted = EXCLUDED.formerly_adopted;
  RETURN NULL;
END
$function$;

-- FUNCTION: find_top_k_filtered
CREATE OR REPLACE FUNCTION public.find_top_k_filtered(query_embedding vector, k integer, adopter_gender text DEFAULT NULL::text, adopter_veteran_status text DEFAULT NULL::text, adopter_state text DEFAULT NULL::text)
 RETURNS TABLE(id text, embedding vector, bio text, gender text, veteran_status text, state text, first_name text, last_name text, age integer, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$ -- select adoptee.status to filter for OFC
 select adoptee.id,
  adoptee.embedding,
  adoptee.bio,
  adoptee.gender,
  adoptee.veteran_status,
  adoptee.state,
  adoptee.first_name,
  adoptee.last_name,
  date_part('year', age(adoptee.dob))::int as age,
  1 - (adoptee.embedding <=> query_embedding) as similarity
 from public.adoptee_vector as adoptee
 order by
  (adopter_gender is null or lower(adoptee.gender) = lower(adopter_gender)) desc,
  (adopter_state is null or lower(adoptee.state) = lower(adopter_state)) desc,
  (adopter_veteran_status is null or adoptee.veteran_status = adopter_veteran_status) desc,
  similarity desc
 limit k;
$function$;

-- FUNCTION: get_adoptee_with_facility
CREATE OR REPLACE FUNCTION public.get_adoptee_with_facility(adoptee_id text)
 RETURNS TABLE(id text, personal_bio text, gender text, veteran_tatus text, offense text, state text, first_name text, last_name text, dob date, inmate_id text, status adoptee_status, formerly_adopted boolean, facility_name text, mailing_address text, system text)
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

-- FUNCTION: transfer_tables
CREATE OR REPLACE FUNCTION public.transfer_tables()
 RETURNS void
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'vecs', 'pg_catalog', 'pg_temp'
AS $function$INSERT INTO public.adoptee_vector (
    id, inmate_id, embedding, bio, gender, dob, veteran_status, offense, state, first_name, last_name
)
SELECT
    id,
    metadata->>'inmate_id',
    vec AS embedding,
    metadata->>'bio',
    metadata->>'gender',
    (metadata->>'dob')::date,
    metadata->>'veteran_status',
    metadata->>'offense',
    metadata->>'state',
    metadata->>'first_name',
    metadata->>'last_name'
FROM vecs.adoptee_vector
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.adoptee_vector t 
    WHERE t.id = vecs.adoptee_vector.id
);$function$;

-- 6. Recreate triggers
CREATE TRIGGER trigger_sync_matched_adoptee_name 
BEFORE UPDATE ON public.adopter_applications 
FOR EACH ROW EXECUTE FUNCTION sync_matched_adoptee_name();

CREATE TRIGGER vec_transfer 
AFTER INSERT OR UPDATE ON vecs.adoptee_vector 
FOR EACH STATEMENT EXECUTE FUNCTION vec_transfer();

-- FUNCTION: find_top_k_filtered_new
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

-- FUNCTION: get_user_and_application
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
