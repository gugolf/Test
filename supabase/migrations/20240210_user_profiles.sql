-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    email TEXT PRIMARY KEY,
    real_name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.user_profiles
    FOR SELECT TO authenticated USING (true);

-- Allow all access for authenticated users (simplified for internal tool)
CREATE POLICY "Allow all access for authenticated users" ON public.user_profiles
    FOR ALL TO authenticated USING (true);

-- Seed Initial Data
INSERT INTO public.user_profiles (email, real_name, role) VALUES
('exerecruit01@gmail.com', 'Thikamporn', 'user'),
('exerecruit02@gmail.com', 'Tarinee', 'user'),
('exerecruit03@gmail.com', 'Patnaree', 'user'),
('exerecruit04@gmail.com', 'Tanyajittra', 'user'),
('exerecruit05@gmail.com', 'Punyisa', 'user'),
('pascalbillaud@gmail.com', 'Pascal', 'admin'),
('hathaichanok.chompoonoi@gmail.com', 'Nook', 'user'),
('sumethwork@gmail.com', 'Admin', 'admin')
ON CONFLICT (email) DO UPDATE SET real_name = EXCLUDED.real_name;
