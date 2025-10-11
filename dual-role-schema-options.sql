-- SQL to modify schema for dual admin/player roles
-- Run this in your Supabase SQL Editor

-- Option 1: Add a separate admin flag
ALTER TABLE user_profiles
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Update existing admins
UPDATE user_profiles
SET is_admin = TRUE
WHERE role = 'admin';

-- Now users can be both player and admin
-- role = 'player' AND is_admin = TRUE = Admin Player
-- role = 'player' AND is_admin = FALSE = Regular Player
-- role = 'admin' AND is_admin = TRUE = Pure Admin (if you want to keep this)

-- Option 2: Change role to support multiple values
-- First, create a new column
ALTER TABLE user_profiles
ADD COLUMN roles TEXT[] DEFAULT ARRAY['player'];

-- Migrate existing data
UPDATE user_profiles
SET roles = CASE
    WHEN role = 'admin' THEN ARRAY['admin', 'player']
    WHEN role = 'player' THEN ARRAY['player']
END;

-- Then you can drop the old role column
-- ALTER TABLE user_profiles DROP COLUMN role;

-- Option 3: Keep current system but allow role switching
-- Users can switch between 'admin' and 'player' roles as needed
-- This is the simplest approach
