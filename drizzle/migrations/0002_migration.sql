CREATE TABLE public.library_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doi text,
  title text NOT NULL,
  authors jsonb DEFAULT '[]'::jsonb,
  year int,
  journal text,
  abstract text,
  url text,
  pdf_url text,
  source text,
  is_preprint boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_papers TO authenticated;
GRANT ALL ON public.library_papers TO service_role;
ALTER TABLE public.library_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own papers" ON public.library_papers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);