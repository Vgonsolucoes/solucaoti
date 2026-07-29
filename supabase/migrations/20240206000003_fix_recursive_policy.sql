-- Drop the recursive policy
DROP POLICY IF EXISTS "Authorized users can manage users" ON public.users;

-- Create separate policies for modification operations to avoid infinite recursion on SELECT
-- The existing "Users can view all users" policy handles SELECT operations

CREATE POLICY "Authorized users can insert users" ON public.users FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator', 'operator')
  )
);

CREATE POLICY "Authorized users can update users" ON public.users FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator', 'operator')
  )
);

CREATE POLICY "Authorized users can delete users" ON public.users FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master_operator', 'operator')
  )
);
