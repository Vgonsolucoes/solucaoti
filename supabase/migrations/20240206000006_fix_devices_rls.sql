-- Add RLS policies for devices table to ensure proper permissions

-- Drop existing device policies if they exist
DROP POLICY IF EXISTS "View all devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated can manage devices" ON public.devices;

-- Create comprehensive device policies
CREATE POLICY "Anyone can view devices" ON public.devices FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage devices" ON public.devices FOR ALL USING (
  auth.role() = 'authenticated'
);

-- Create specific policies for different operations if needed
CREATE POLICY "Authenticated users can update device status" ON public.devices FOR UPDATE USING (
  auth.role() = 'authenticated'
) WITH CHECK (true);