-- Add RLS policies for assignments table

-- Allow authenticated users to view assignments
CREATE POLICY "Authenticated users can view assignments" ON public.assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'operator', 'master_operator')
  )
);

-- Allow authenticated users to create assignments (vinculações)
CREATE POLICY "Authenticated users can create assignments" ON public.assignments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'operator', 'master_operator')
  )
);

-- Allow authenticated users to update assignments (aceitar termos, etc.)
CREATE POLICY "Authenticated users can update assignments" ON public.assignments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'operator', 'master_operator')
  )
);

-- Allow authenticated users to delete assignments
CREATE POLICY "Authenticated users can delete assignments" ON public.assignments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'operator', 'master_operator')
  )
);