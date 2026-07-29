-- Drop the existing policy that relies on JWT role claim which is likely missing
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create a new policy that checks the user's role in the public.users table
-- This allows admin, master_operator, and operator to manage (create/update/delete) users
CREATE POLICY "Authorized users can manage users" ON public.users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator', 'operator')
  )
);
