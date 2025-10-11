# Security Guide for Admin Creation

## 🔒 Security Measures Implemented

### 1. **Environment-Based Protection**
- Admin creation is **completely disabled in production**
- Only available in development mode (`NODE_ENV !== 'production'`)

### 2. **Secret Key Authentication**
- Requires a secret key to access the admin creation form
- Secret key is stored in environment variables
- Default key: `dev-admin-2024` (change this!)

### 3. **Server-Side Validation**
- All admin creation happens through a secure API route
- Server-side validation of secret key
- Proper error handling and cleanup

### 4. **Database Security**
- Uses service role key for admin creation
- Auto-confirms email addresses
- Creates both user profile and player record

## 🛡️ How to Secure Your Admin Creation

### Step 1: Set Strong Secret Keys
Add to your `.env.local` file:
```bash
# Generate a strong, random secret key
ADMIN_CREATION_SECRET_KEY=your_very_strong_random_key_here
NEXT_PUBLIC_ADMIN_CREATION_KEY=your_very_strong_random_key_here
```

### Step 2: Generate a Strong Secret Key
Use this command to generate a secure key:
```bash
# Generate a random 32-character key
openssl rand -hex 32
```

### Step 3: Production Deployment
- **Never deploy** with admin creation enabled
- The route automatically redirects to home page in production
- Remove or comment out the route in production builds

### Step 4: Additional Security (Optional)
Uncomment this section in `/api/create-admin/route.ts` to limit to one admin:
```typescript
// Optional: Limit to one admin (uncomment if you want only one admin)
if (existingAdmins && existingAdmins.length > 0) {
  return NextResponse.json(
    { error: 'Admin account already exists' },
    { status: 409 }
  )
}
```

## 🚨 Security Best Practices

### ✅ DO:
- Use strong, random secret keys
- Change default secret keys immediately
- Test admin creation in development only
- Remove admin creation route in production
- Use environment variables for all secrets
- Monitor admin account creation

### ❌ DON'T:
- Use weak or default secret keys
- Deploy admin creation to production
- Share secret keys in code or documentation
- Leave admin creation accessible publicly
- Use the same secret key across environments

## 🔧 Usage Instructions

### For Development:
1. Set your secret key in `.env.local`
2. Navigate to `/create-admin`
3. Enter the secret key
4. Fill in admin details
5. Admin account is created

### For Production:
- Admin creation is automatically disabled
- Route redirects to home page
- No admin creation possible

## 🆘 Emergency Admin Creation

If you need to create an admin in production:

1. **Temporarily enable** (NOT RECOMMENDED):
   - Set `NODE_ENV=development` temporarily
   - Create admin account
   - Set `NODE_ENV=production` back

2. **Database Direct** (RECOMMENDED):
   - Use Supabase dashboard
   - Create user in Auth section
   - Update user_profiles table manually
   - Set role='admin' and status='approved'

3. **SQL Script** (RECOMMENDED):
   ```sql
   -- Create admin user profile
   INSERT INTO user_profiles (id, email, name, role, status, approved_at)
   VALUES ('user-uuid', 'admin@example.com', 'Admin Name', 'admin', 'approved', NOW());

   -- Create player record
   INSERT INTO players (user_id, preferred_position)
   VALUES ('user-uuid', 'Admin');
   ```

## 📝 Security Checklist

- [ ] Strong secret key set in environment variables
- [ ] Default secret key changed
- [ ] Admin creation disabled in production
- [ ] Secret keys not committed to version control
- [ ] Environment variables properly configured
- [ ] Database RLS policies in place
- [ ] Admin accounts monitored
- [ ] Emergency admin creation plan documented

---

**Remember**: Security is an ongoing process. Regularly review and update your security measures!
