-- Add missing DELETE policy for profiles table so admins can delete customers

-- Allow admins to delete all profiles
CREATE POLICY "Admins can delete all profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

