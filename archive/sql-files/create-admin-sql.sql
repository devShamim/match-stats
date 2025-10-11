-- Quick Admin Creation SQL
-- Run this in your Supabase SQL Editor after creating a user through normal registration

-- Method 1: If you already registered a user, promote them to admin
-- Replace 'your-email@example.com' with your actual email
UPDATE user_profiles
SET
  role = 'admin',
  status = 'approved',
  approved_at = NOW()
WHERE email = 'your-email@example.com';

-- Method 2: Create a new admin user directly (if you haven't registered yet)
-- First, you need to create the auth user through the Supabase Auth dashboard
-- Then run this to create the profile:

-- Step 1: Go to Supabase Dashboard > Authentication > Users
-- Step 2: Click "Add user" and create a user with email/password
-- Step 3: Copy the user ID from the created user
-- Step 4: Replace 'USER_ID_HERE' with the actual user ID and run:

INSERT INTO user_profiles (
  id,
  email,
  name,
  role,
  status,
  approved_at
) VALUES (
  'USER_ID_HERE',
  'admin@footballstats.com',
  'Admin User',
  'admin',
  'approved',
  NOW()
);

-- Method 3: Check if your user exists and what their status is
SELECT
  id,
  email,
  name,
  role,
  status,
  approved_at,
  created_at
FROM user_profiles
WHERE email = 'your-email@example.com';

-- Method 4: List all users to see what's in the database
SELECT
  id,
  email,
  name,
  role,
  status,
  approved_at,
  created_at
FROM user_profiles
ORDER BY created_at DESC;
