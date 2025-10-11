-- SQL to handle existing user and make them admin
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Check if user already exists
-- ============================================
-- First, let's see what we have
SELECT
    u.id,
    u.email,
    u.email_confirmed_at,
    up.name,
    up.role,
    up.status,
    up.approved_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'rezaul.sovware@gmail.com';

-- ============================================
-- STEP 2: Update existing user to admin
-- ============================================
-- If the user exists, just update their profile to admin

UPDATE user_profiles
SET
    role = 'admin',
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
WHERE id = (
    SELECT id FROM auth.users
    WHERE email = 'rezaul.sovware@gmail.com'
);

-- ============================================
-- STEP 3: If user profile doesn't exist, create it
-- ============================================
-- This handles the case where auth user exists but no profile

INSERT INTO user_profiles (
    id,
    email,
    name,
    role,
    status,
    approved_at,
    created_at,
    updated_at
)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', 'Rezaul Admin'),
    'admin',
    'approved',
    NOW(),
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'rezaul.sovware@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = u.id
);

-- ============================================
-- STEP 4: Create player record if needed
-- ============================================
-- Add player record so admin can also participate in matches

INSERT INTO players (
    user_id,
    preferred_position,
    created_at,
    updated_at
)
SELECT
    u.id,
    'Admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'rezaul.sovware@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM players p
    WHERE p.user_id = u.id
);

-- ============================================
-- STEP 5: Verify the admin was created/updated
-- ============================================
SELECT
    u.id,
    u.email,
    u.email_confirmed_at,
    up.name,
    up.role,
    up.status,
    up.approved_at,
    p.id as player_id,
    p.preferred_position
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
LEFT JOIN players p ON u.id = p.user_id
WHERE u.email = 'rezaul.sovware@gmail.com';

-- ============================================
-- ALTERNATIVE: Complete solution in one query
-- ============================================
-- This handles all cases (existing user, missing profile, etc.)

-- First, ensure the user profile exists and is admin
INSERT INTO user_profiles (
    id,
    email,
    name,
    role,
    status,
    approved_at,
    created_at,
    updated_at
)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', 'Rezaul Admin'),
    'admin',
    'approved',
    NOW(),
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'rezaul.sovware@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW();

-- Then, ensure the player record exists
INSERT INTO players (
    user_id,
    preferred_position,
    created_at,
    updated_at
)
SELECT
    u.id,
    'Admin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'rezaul.sovware@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    preferred_position = 'Admin',
    updated_at = NOW();

-- ============================================
-- LOGIN INFORMATION
-- ============================================
-- If the user already exists, they should use their existing password
-- If you need to reset their password, use this:

-- UPDATE auth.users
-- SET encrypted_password = crypt('TempPassword123!', gen_salt('bf'))
-- WHERE email = 'rezaul.sovware@gmail.com';
