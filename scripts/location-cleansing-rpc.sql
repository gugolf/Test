-- SQL Reference: Stored Procedure for Location Cleansing
-- For use in n8n as the final node or manual execution in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.fn_process_location_cleansing()
RETURNS void AS $$
BEGIN
    -- 1. [ONBOARDING] เก็บตกชื่อสถานที่ใหม่ๆ ลงตารางกลางเป็น "Wait AI check"
    INSERT INTO unique_location_name (unique_location, country)
    SELECT DISTINCT ce.work_location, 'Wait AI check'
    FROM candidate_experiences ce
    WHERE ce.work_location IS NOT NULL 
      AND ce.work_location != ''
      AND NOT EXISTS (
        SELECT 1 FROM unique_location_name uln 
        WHERE uln.unique_location = ce.work_location
      );

    -- 2. [ONBOARDING] เก็บตกชื่อบริษัทใหม่ๆ ลงตาราง HQ เป็น "Wait AI check"
    INSERT INTO company_reference_location (company, unique_location)
    SELECT DISTINCT ce.company, 'Wait AI check'
    FROM candidate_experiences ce
    WHERE ce.company IS NOT NULL
      AND ce.company != ''
      AND (ce.work_location IS NULL OR ce.work_location = '')
      AND ce.country IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM company_reference_location crl 
        WHERE crl.company = ce.company
      );

    -- 3. [SMART DISCOVERY] ล้าง "Wait AI check" ด้วยการค้นหาประเทศอัจฉริยะ (Location)
    UPDATE unique_location_name uln
    SET country = sub.found_country
    FROM (
        SELECT uln_inner.id, MAX(c.country) as found_country
        FROM unique_location_name uln_inner
        JOIN country c ON uln_inner.unique_location ILIKE '%' || c.country || '%'
        WHERE uln_inner.country = 'Wait AI check'
        GROUP BY uln_inner.id
        HAVING COUNT(DISTINCT c.country) = 1
    ) sub
    WHERE uln.id = sub.id;

    -- 4. [SMART DISCOVERY] ล้าง "Wait AI check" ด้วยการค้นหาประเทศอัจฉริยะ (HQ)
    UPDATE company_reference_location crl
    SET unique_location = sub.found_country
    FROM (
        SELECT crl_inner.id, MAX(c.country) as found_country
        FROM company_reference_location crl_inner
        JOIN country c ON crl_inner.company ILIKE '%' || c.country || '%'
        WHERE crl_inner.unique_location = 'Wait AI check'
        GROUP BY crl_inner.id
        HAVING COUNT(DISTINCT c.country) = 1
    ) sub
    WHERE crl.id = sub.id;

    -- 5. [SYNC] ดันประเทศจากสถานที่ (Location Input) กลับเข้า Experiences
    UPDATE candidate_experiences ce
    SET 
      country = uln.country,
      note = trim(concat(ce.note, E'\n', 'Location from profile input by candidate'))
    FROM unique_location_name uln
    WHERE ce.work_location = uln.unique_location
      AND ce.country IS NULL 
      AND uln.country IS NOT NULL 
      AND uln.country != 'Wait AI check';

    -- 6. [SYNC] ดันประเทศจากสำนักงานใหญ่ (HQ Location) กลับเข้า Experiences
    UPDATE candidate_experiences ce
    SET 
      country = crl.unique_location,
      note = trim(concat(ce.note, E'\n', 'Location from HQ location'))
    FROM company_reference_location crl
    WHERE ce.company = crl.company
      AND ce.country IS NULL 
      AND (ce.work_location IS NULL OR ce.work_location = '')
      AND crl.unique_location IS NOT NULL 
      AND crl.unique_location != 'Wait AI check';

END;
$$ LANGUAGE plpgsql;
