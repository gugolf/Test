-- Robust, Self-Correcting Candidate ID Reservation RPC
-- This version dynamically finds the correct sequence name to avoid "relation does not exist" errors.

CREATE OR REPLACE FUNCTION public.reserve_candidate_ids(batch_size int)
RETURNS TABLE (start_id int, end_id int) AS $$
DECLARE
    actual_max_id int;
    next_start_id int;
    found_seq_name text;
BEGIN
    -- 1. Scan for the highest numeric ID currently in the table (e.g., 'C07426' -> 7426)
    SELECT COALESCE(MAX(CAST(SUBSTRING(candidate_id FROM 2) AS INT)), 0)
    INTO actual_max_id
    FROM "Candidate Profile";

    -- 2. Dynamically find the sequence name for this table
    -- We look for sequences owned by the 'Candidate Profile' table or matching common naming patterns
    SELECT 
        c.relname
    INTO found_seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' 
      AND (
          c.relname ILIKE '%Candidate Profile%' 
          OR c.relname ILIKE '%candidate%profile%id%seq%'
          OR c.relname = 'candidate_id_seq'
      )
    LIMIT 1;

    -- Fallback if no sequence is found (will raise a clear error if needed)
    IF found_seq_name IS NULL THEN
        RAISE EXCEPTION 'Could not find a valid sequence for Candidate Profile. Please check sequence names in your database.';
    END IF;

    -- 3. Get the next value from the discovered sequence
    EXECUTE format('SELECT nextval(%L)', found_seq_name) INTO next_start_id;

    -- 4. [HEART OF THE FIX] If the sequence is lagging behind the reality, jump ahead!
    IF next_start_id <= actual_max_id THEN
        next_start_id := actual_max_id + 1;
    END IF;

    -- 5. Mark the end of the reserved batch and sync the sequence
    PERFORM setval(found_seq_name, next_start_id + batch_size - 1, true);

    RETURN QUERY SELECT next_start_id::int, (next_start_id + batch_size - 1)::int;
END;
$$ LANGUAGE plpgsql;
