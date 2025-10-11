-- Create a function to promote a user to admin
-- Run this in your Supabase SQL Editor after creating your first user

-- First, create your user account through the normal registration process
-- Then run this SQL to promote yourself to admin:

-- Replace 'your-email@example.com' with your actual email
UPDATE user_profiles
SET
  role = 'admin',
  status = 'approved',
  approved_at = NOW(),
  approved_by = (SELECT id FROM user_profiles WHERE email = 'your-email@example.com' LIMIT 1)
WHERE email = 'your-email@example.com';

-- Alternative: If you want to create an admin user directly
-- (This bypasses the normal registration flow)
INSERT INTO user_profiles (
  id,
  email,
  name,
  role,
  status,
  approved_at
) VALUES (
  gen_random_uuid(),
  'admin@footballstats.com',
  'Admin User',
  'admin',
  'approved',
  NOW()
);

-- Then create the corresponding auth user
-- You'll need to do this through the Supabase Auth dashboard or use the signup API
