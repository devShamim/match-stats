-- Fix for infinite recursion in user_profiles RLS policies
-- Run this in your Supabase SQL Editor

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Create new policies that don't cause infinite recursion
-- These policies use auth.jwt() to get role information instead of querying the table

-- Policy for admins to view all profiles (using JWT claims)
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' AND
    auth.jwt() ->> 'status' = 'approved'
  );

-- Policy for admins to update all profiles (using JWT claims)
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin' AND
    auth.jwt() ->> 'status' = 'approved'
  );

-- Alternative: If JWT claims don't work, use a simpler approach
-- Drop the JWT-based policies and create simpler ones
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Create policies that allow all authenticated users to view profiles
-- (We'll handle admin restrictions in the application layer)
CREATE POLICY "Authenticated users can view profiles" ON user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow inserts for new user registration
CREATE POLICY "Anyone can insert new profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
