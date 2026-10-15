-- pg_restore loads table data with an empty search_path. Resolve nested helpers
-- in their owning schema without changing signatures, volatility, or CHECK rules.
-- Keep this additive migration on application rollback; no data is rewritten.
BEGIN;
CREATE OR REPLACE FUNCTION public.ans_agri_task_date_valid(value JSONB) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE AS $$
  SELECT (jsonb_typeof(value) = 'object' AND value ?& ARRAY['state','at'] AND
    value - ARRAY['state','at'] = '{}'::jsonb AND
    ((value->>'state' = 'UNKNOWN' AND value->'at' = 'null'::jsonb) OR
     (value->>'state' IN ('TENTATIVE','CONFIRMED') AND jsonb_typeof(value->'at') = 'string' AND public.ans_agri_task_instant_valid(value->>'at')))) IS TRUE;
$$;
CREATE OR REPLACE FUNCTION public.ans_agri_task_input_valid(value JSONB) RETURNS BOOLEAN
LANGUAGE SQL IMMUTABLE AS $$
  SELECT (jsonb_typeof(value) = 'object' AND value ?& ARRAY['from','needed','latestAt'] AND
    value - ARRAY['from','needed','latestAt'] = '{}'::jsonb AND
    jsonb_typeof(value->'from') = 'string' AND length(btrim(value->>'from')) BETWEEN 1 AND 160 AND
    jsonb_typeof(value->'needed') = 'string' AND length(btrim(value->>'needed')) BETWEEN 1 AND 2000 AND
    public.ans_agri_task_date_valid(value->'latestAt')) IS TRUE;
$$;
CREATE OR REPLACE FUNCTION public.ans_agri_task_inputs_valid(value JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB;
BEGIN
  IF (jsonb_typeof(value) = 'object' AND value ?& ARRAY['schemaVersion','items'] AND
    value - ARRAY['schemaVersion','items'] = '{}'::jsonb AND value->'schemaVersion' = '1'::jsonb AND jsonb_typeof(value->'items') = 'array') IS NOT TRUE THEN RETURN FALSE; END IF;
  IF jsonb_array_length(value->'items') > 20 THEN RETURN FALSE; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(value->'items') LOOP
    IF NOT public.ans_agri_task_input_valid(item) THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;
COMMIT;
