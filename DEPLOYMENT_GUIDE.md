# 🚀 Vercel Deployment Guide for Football Stats App

## Prerequisites
- GitHub account
- Vercel account (free tier available)
- Supabase project set up
- Local development environment working

## Step 1: Prepare Your Project for Production

### 1.1 Environment Variables Setup
Create a `.env.production` file (or update your existing `.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin Creation Security (Optional - for production)
ADMIN_CREATION_SECRET_KEY=your_very_strong_secret_key_here
NEXT_PUBLIC_ADMIN_CREATION_KEY=your_very_strong_secret_key_here

# Next.js Configuration
NODE_ENV=production
```

### 1.2 Update package.json (if needed)
Ensure your `package.json` has the correct build script:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 1.3 Test Local Build
Before deploying, test your build locally:

```bash
npm run build
npm run start
```

## Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - Football Stats App"
```

### 2.2 Create GitHub Repository
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it `football-stats-app` (or your preferred name)
4. Make it public or private
5. Don't initialize with README (you already have files)

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/football-stats-app.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Vercel

### 3.1 Connect to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository

### 3.2 Configure Project Settings
- **Framework Preset**: Next.js (should auto-detect)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 3.3 Set Environment Variables
In Vercel dashboard, go to Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL = your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY = your_supabase_service_role_key
ADMIN_CREATION_SECRET_KEY = your_very_strong_secret_key_here
NEXT_PUBLIC_ADMIN_CREATION_KEY = your_very_strong_secret_key_here
NODE_ENV = production
```

### 3.4 Deploy
Click "Deploy" and wait for the build to complete.

## Step 4: Configure Supabase for Production

### 4.1 Update Supabase Settings
1. Go to your Supabase project dashboard
2. Go to Settings → API
3. Add your Vercel domain to allowed origins:
   - `https://your-app-name.vercel.app`
   - `https://your-app-name-git-main.vercel.app` (preview URLs)

### 4.2 Update RLS Policies (if needed)
Ensure your RLS policies work with production:

```sql
-- Check if policies are working
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### 4.3 Test Database Connection
After deployment, test that your app can connect to Supabase.

## Step 5: Post-Deployment Configuration

### 5.1 Create Admin User
Use your Supabase SQL Editor to create the first admin:

```sql
-- Create admin user (use the SQL from fix-existing-user-admin.sql)
-- Or use the admin creation utility at /create-admin
```

### 5.2 Test All Features
1. **Authentication**: Register/Login
2. **Admin Functions**: Create players, matches
3. **Image Upload**: Test profile image uploads
4. **Statistics**: Verify stats are working
5. **Public Pages**: Check public stats page

### 5.3 Set Up Custom Domain (Optional)
1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS settings as instructed
4. Update Supabase allowed origins

## Step 6: Production Optimizations

### 6.1 Enable Analytics (Optional)
In Vercel dashboard:
- Go to Analytics tab
- Enable Web Analytics for insights

### 6.2 Set Up Monitoring
- Enable Vercel's built-in monitoring
- Set up error tracking (optional)

### 6.3 Performance Optimization
- Enable Vercel's Edge Functions (if needed)
- Optimize images (already configured with Next.js Image)

## Troubleshooting Common Issues

### Issue 1: Build Failures
**Solution**: Check build logs in Vercel dashboard
- Common causes: Missing environment variables, TypeScript errors
- Fix: Update environment variables, fix code issues

### Issue 2: Database Connection Errors
**Solution**: Verify Supabase configuration
- Check environment variables are set correctly
- Verify Supabase project is active
- Check RLS policies

### Issue 3: Image Upload Not Working
**Solution**: Check Supabase Storage configuration
- Verify storage bucket exists
- Check storage policies
- Ensure CORS is configured

### Issue 4: Authentication Issues
**Solution**: Check Supabase Auth settings
- Verify allowed origins include your Vercel domain
- Check email templates (if using email auth)
- Verify redirect URLs

## Security Checklist for Production

- ✅ **Environment Variables**: All secrets stored in Vercel, not in code
- ✅ **Admin Creation**: Disabled in production (NODE_ENV check)
- ✅ **RLS Policies**: Properly configured
- ✅ **CORS**: Supabase configured for your domain
- ✅ **HTTPS**: Vercel provides SSL automatically
- ✅ **Secrets**: Strong admin creation keys

## Deployment Commands Summary

```bash
# 1. Test locally
npm run build
npm run start

# 2. Push to GitHub
git add .
git commit -m "Ready for production deployment"
git push origin main

# 3. Deploy on Vercel
# - Go to vercel.com
# - Import GitHub repository
# - Set environment variables
# - Deploy
```

## Post-Deployment URLs

After successful deployment, you'll have:
- **Production URL**: `https://your-app-name.vercel.app`
- **Admin Panel**: `https://your-app-name.vercel.app/admin`
- **Public Stats**: `https://your-app-name.vercel.app/stats`
- **Player Management**: `https://your-app-name.vercel.app/players`

## Support and Maintenance

### Regular Tasks:
1. **Monitor**: Check Vercel dashboard for errors
2. **Update**: Keep dependencies updated
3. **Backup**: Regular Supabase backups
4. **Security**: Review access logs periodically

### Scaling:
- Vercel automatically handles scaling
- Supabase handles database scaling
- Monitor usage in both dashboards

---

**🎉 Congratulations! Your Football Stats App is now live on Vercel!**
