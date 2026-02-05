-- ENHANCE TENANTS TABLE
-- Adds missing columns for full tenant management features

-- 1. Add new columns
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_start_date date,
ADD COLUMN IF NOT EXISTS subscription_end_date date,
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 2. Backfill slug for existing tenants
-- Use a simple lowercasing and space replacement strategy for now
UPDATE public.tenants 
SET slug = lower(replace(name, ' ', '-'))
WHERE slug IS NULL;

-- 3. Enforce Not Null and Unique on slug
ALTER TABLE public.tenants 
ALTER COLUMN slug SET NOT NULL,
ADD CONSTRAINT tenants_slug_key UNIQUE (slug);

-- 4. Enable RLS on tenants table (if not already enabled)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for tenants table

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Public Read Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admin Update Tenants" ON public.tenants;

-- Policy: Everyone can read public tenant info (needed for login/slug resolution)
CREATE POLICY "Public Read Tenant Info" ON public.tenants
FOR SELECT
USING (true);

-- Policy: Super Admins can do everything
CREATE POLICY "Super Admin Full Access" ON public.tenants
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- Policy: Tenant Admins can update their own tenant settings
CREATE POLICY "Tenant Admin Update Own" ON public.tenants
FOR UPDATE
USING (
    id = (
        SELECT tenant_id FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
