import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth, supabaseAdmin } from '@/lib/auth'

export async function PUT(request: NextRequest) {
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
    const { playerId, userId, updates } = body

    // Validate required fields
    if (!playerId || !userId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        name: updates.name,
        email: updates.email,
        position: updates.position,
        phone: updates.phone,
        photo_url: updates.photo_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json(
        { error: `Failed to update user profile: ${profileError.message}` },
        { status: 400 }
      )
    }

    // Update player record
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .update({
        jersey_number: updates.jersey_number,
        preferred_position: updates.preferred_position,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .single()

    if (playerError) {
      console.error('Player update error:', playerError)
      return NextResponse.json(
        { error: `Failed to update player record: ${playerError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      player: playerData
    })

  } catch (error: any) {
    console.error('Player update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
