-- SQL to create an admin user with email: rezaul.sovware@gmail.com
-- Run this in your Supabase SQL Editor

-- ============================================
-- METHOD 1: Create Admin User (Recommended)
-- ============================================
-- This creates both the auth user and admin profile

-- Step 1: Create the auth user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'rezaul.sovware@gmail.com',
    crypt('TempPassword123!', gen_salt('bf')), -- Temporary password
    NOW(),
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Rezaul Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Step 2: Get the user ID that was just created
-- (You'll need to run this separately to get the ID)
SELECT id FROM auth.users WHERE email = 'rezaul.sovware@gmail.com';

-- Step 3: Create the user profile with admin role
-- Replace 'USER_ID_FROM_STEP_2' with the actual ID from step 2
INSERT INTO user_profiles (
    id,
    email,
    name,
    role,
    status,
    approved_at,
    created_at,
    updated_at
) VALUES (
    'USER_ID_FROM_STEP_2', -- Replace with actual user ID
    'rezaul.sovware@gmail.com',
    'Rezaul Admin',
    'admin',
    'approved',
    NOW(),
    NOW(),
    NOW()
);

-- Step 4: Create player record (optional - if you want admin to also be a player)
INSERT INTO players (
    user_id,
    preferred_position,
    created_at,
    updated_at
) VALUES (
    'USER_ID_FROM_STEP_2', -- Replace with actual user ID
    'Admin',
    NOW(),
    NOW()
);

-- ============================================
-- METHOD 2: Simpler Approach (If auth user already exists)
-- ============================================
-- If the user already exists in auth.users, just update their profile

-- Update existing user to admin
UPDATE user_profiles
SET
    role = 'admin',
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
WHERE email = 'rezaul.sovware@gmail.com';

-- ============================================
-- METHOD 3: Complete One-Step Process
-- ============================================
-- This does everything in one go (more complex but complete)

WITH new_user AS (
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'rezaul.sovware@gmail.com',
        crypt('TempPassword123!', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Rezaul Admin"}',
        NOW(),
        NOW()
    )
    RETURNING id
)
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
    id,
    'rezaul.sovware@gmail.com',
    'Rezaul Admin',
    'admin',
    'approved',
    NOW(),
    NOW(),
    NOW()
FROM new_user;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if admin was created successfully
SELECT
    u.id,
    u.email,
    up.name,
    up.role,
    up.status,
    up.approved_at
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'rezaul.sovware@gmail.com';

-- Check if user can login
SELECT
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'rezaul.sovware@gmail.com';

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
-- Email: rezaul.sovware@gmail.com
-- Password: TempPassword123!
--
-- IMPORTANT: The user should change this password on first login!
