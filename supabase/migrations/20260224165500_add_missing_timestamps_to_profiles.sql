-- ADD MISSING STATUS/TIMESTAMP COLUMNS

-- Add standard timestamp columns to public.profiles to prevent Next.js sorting crashes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
