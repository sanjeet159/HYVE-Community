
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP POLICY "Anyone can submit applications" ON public.applications;

CREATE POLICY "Anyone can submit valid applications"
  ON public.applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) BETWEEN 2 AND 100
    AND length(trim(whatsapp_number)) BETWEEN 5 AND 20
    AND length(trim(city)) BETWEEN 2 AND 100
    AND length(trim(why_join)) BETWEEN 10 AND 2000
    AND status = 'pending'
  );
