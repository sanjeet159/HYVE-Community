-- Add columns for "Other" specialization and resume upload
ALTER TABLE public.applications
ADD COLUMN other_specialization TEXT,
ADD COLUMN resume_url TEXT;

-- Create resumes storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload a resume (applications are public)
CREATE POLICY "Anyone can upload resumes"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'resumes');

-- Admins can view resumes
CREATE POLICY "Admins can view resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete resumes
CREATE POLICY "Admins can delete resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'::app_role));