import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const { error: authError, user } = await verifyAdminAuth(request)
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, position, phone, jersey_number, preferred_position, photo_url } = body

    // Validate required fields
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // First, create a Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: 'TempPassword123!', // Temporary password - user should change this
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name: name.trim(),
        position: position || null,
        phone: phone || null
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      )
    }

    // Wait a moment for the trigger to create the user profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Get the created user profile
    let profileData
    const { data: fetchedProfileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      // If profile wasn't created by trigger, create it manually
      const { data: newProfileData, error: newProfileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: email.trim(),
          name: name.trim(),
          position: position || null,
          phone: phone || null,
          photo_url: photo_url || null,
          role: 'player',
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (newProfileError) {
        console.error('Profile creation error:', newProfileError)
        return NextResponse.json(
          { error: `Failed to create user profile: ${newProfileError.message}` },
          { status: 400 }
        )
      }
      profileData = newProfileData
    } else {
      profileData = fetchedProfileData
    }

    // Update the profile with additional data if needed
    if (profileData) {
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          position: position || null,
          phone: phone || null,
          photo_url: photo_url || null,
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json(
          { error: `Failed to update user profile: ${updateError.message}` },
          { status: 400 }
        )
      }
    }

    // Then create a player record
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .insert({
        user_id: authData.user.id,
        jersey_number: jersey_number ? parseInt(jersey_number) : null,
        preferred_position: preferred_position || null
      })
      .select()
      .single()

    if (playerError) {
      console.error('Player creation error:', playerError)
      return NextResponse.json(
        { error: `Failed to create player record: ${playerError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      profile: profileData,
      player: playerData
    })

  } catch (error: any) {
    console.error('Player creation API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
