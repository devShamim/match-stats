import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase configuration')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Authentication helper function for admin routes
export async function verifyAdminAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return { error: 'Invalid token' }
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { error: 'User profile not found' }
    }

    if (profile.role !== 'admin' || profile.status !== 'approved') {
      return { error: 'Admin access required' }
    }

    return { user }
  } catch (error) {
    return { error: 'Authentication failed' }
  }
}

// Authentication helper function for any authenticated user
export async function verifyUserAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return { error: 'Invalid token' }
    }

    // Check if user profile exists and is approved
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { error: 'User profile not found' }
    }

    if (profile.status !== 'approved') {
      return { error: 'User account not approved' }
    }

    return { user, profile }
  } catch (error) {
    return { error: 'Authentication failed' }
  }
}

export { supabaseAdmin }
