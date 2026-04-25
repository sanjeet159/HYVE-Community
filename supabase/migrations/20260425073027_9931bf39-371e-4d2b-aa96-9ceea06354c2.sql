DROP POLICY IF EXISTS "Admins can view discovered communities" ON public.discovered_communities;

CREATE POLICY "Anyone can view discovered communities"
  ON public.discovered_communities
  FOR SELECT
  TO anon, authenticated
  USING (true);