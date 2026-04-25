-- Discovered freelance communities table
CREATE TABLE public.discovered_communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  member_count INTEGER,
  skills TEXT[] NOT NULL DEFAULT '{}',
  city TEXT,
  summary TEXT,
  join_link TEXT,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX discovered_communities_unique_link
  ON public.discovered_communities (lower(coalesce(join_link, name)));

CREATE INDEX idx_discovered_communities_discovered_at
  ON public.discovered_communities (discovered_at DESC);

ALTER TABLE public.discovered_communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view discovered communities"
  ON public.discovered_communities FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert discovered communities"
  ON public.discovered_communities FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update discovered communities"
  ON public.discovered_communities FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete discovered communities"
  ON public.discovered_communities FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow the edge function (using service role) to insert is implicit (service role bypasses RLS).

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;