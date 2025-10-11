import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    // Security checks
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin creation is disabled in production' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, name, secretKey } = body

    // Verify secret key
    const expectedKey = process.env.ADMIN_CREATION_SECRET_KEY || 'dev-admin-2024'
    if (secretKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Invalid secret key' },
        { status: 403 }
      )
    }

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Check if any admin already exists
    const { data: existingAdmins, error: adminCheckError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('status', 'approved')

    if (adminCheckError) {
      console.error('Error checking existing admins:', adminCheckError)
      return NextResponse.json(
        { error: 'Failed to check existing admins' },
        { status: 500 }
      )
    }

    // Optional: Limit to one admin (uncomment if you want only one admin)
    // if (existingAdmins && existingAdmins.length > 0) {
    //   return NextResponse.json(
    //     { error: 'Admin account already exists' },
    //     { status: 409 }
    //   )
    // }

    // Create auth user using service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create user profile with admin role
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        name: name.trim(),
        role: 'admin',
        status: 'approved',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Create player record
    const { error: playerError } = await supabaseAdmin
      .from('players')
      .insert({
        user_id: authData.user.id,
        jersey_number: null,
        preferred_position: 'Admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (playerError) {
      console.error('Player creation error:', playerError)
      // Don't fail the whole operation for this
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name.trim(),
      }
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
