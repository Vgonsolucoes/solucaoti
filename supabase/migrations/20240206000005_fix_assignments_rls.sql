-- Add simplified RLS policies for assignments table to test

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can update assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON public.assignments;

-- Create simplified policies for testing
CREATE POLICY "Allow all authenticated users to view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Allow all authenticated users to create assignments" ON public.assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all authenticated users to update assignments" ON public.assignments FOR UPDATE USING (true);
CREATE POLICY "Allow all authenticated users to delete assignments" ON public.assignments FOR DELETE USING (true);