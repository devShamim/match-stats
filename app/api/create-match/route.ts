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
    const {
      type,
      date,
      time,
      opponent,
      location,
      teamA_name,
      teamB_name,
      teamA_color,
      teamB_color,
      selectedPlayers
    } = body

    // Validate required fields
    if (!type || !date || !time) {
      return NextResponse.json(
        { error: 'Type, date, and time are required' },
        { status: 400 }
      )
    }

    // Get user ID from request headers
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError) {
          console.log('Error getting user from token:', userError)
        } else if (user) {
          userId = user.id
          console.log('Found user ID:', userId)
        }
      } catch (error) {
        console.log('Could not get user from token:', error)
      }
    }

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to create matches.' },
        { status: 401 }
      )
    }

    // Create match datetime
    const matchDateTime = new Date(`${date}T${time}`)

    // Create match record with proper user ID and team names
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('matches')
      .insert({
        type,
        date: matchDateTime.toISOString(),
        opponent: type === 'external' ? opponent : null,
        location: location || null,
        status: 'scheduled',
        created_by: userId, // Use actual user ID from authentication
        teamA_name: teamA_name || 'Team A',
        teamB_name: teamB_name || 'Team B',
        teamA_color: teamA_color || '#3B82F6',
        teamB_color: teamB_color || '#EF4444'
      })
      .select()
      .single()

    if (matchError) {
      console.error('Match creation error:', matchError)

      // If it's a foreign key constraint error for created_by, provide helpful message
      if (matchError.code === '23503' && matchError.message.includes('created_by')) {
        return NextResponse.json(
          { error: 'Authentication required. Please log in to create matches.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: `Failed to create match: ${matchError.message}` },
        { status: 400 }
      )
    }

    // Create teams
    const { data: teamAData, error: teamAError } = await supabaseAdmin
      .from('teams')
      .insert({
        match_id: matchData.id,
        name: teamA_name || 'Team A',
        color: teamA_color || '#3B82F6'
      })
      .select()
      .single()

    if (teamAError) {
      console.error('Team A creation error:', teamAError)
      return NextResponse.json(
        { error: `Failed to create Team A: ${teamAError.message}` },
        { status: 400 }
      )
    }

    const { data: teamBData, error: teamBError } = await supabaseAdmin
      .from('teams')
      .insert({
        match_id: matchData.id,
        name: teamB_name || 'Team B',
        color: teamB_color || '#EF4444'
      })
      .select()
      .single()

    if (teamBError) {
      console.error('Team B creation error:', teamBError)
      return NextResponse.json(
        { error: `Failed to create Team B: ${teamBError.message}` },
        { status: 400 }
      )
    }

    // Assign players to teams
    const matchPlayerInserts = []

    // Add Team A players
    if (selectedPlayers.teamA && selectedPlayers.teamA.length > 0) {
      for (const playerId of selectedPlayers.teamA) {
        matchPlayerInserts.push({
          match_id: matchData.id,
          player_id: playerId,
          team_id: teamAData.id
        })
      }
    }

    // Add Team B players
    if (selectedPlayers.teamB && selectedPlayers.teamB.length > 0) {
      for (const playerId of selectedPlayers.teamB) {
        matchPlayerInserts.push({
          match_id: matchData.id,
          player_id: playerId,
          team_id: teamBData.id
        })
      }
    }

    // Insert match players if any are selected
    if (matchPlayerInserts.length > 0) {
      const { data: matchPlayersData, error: matchPlayersError } = await supabaseAdmin
        .from('match_players')
        .insert(matchPlayerInserts)
        .select()

      if (matchPlayersError) {
        console.error('Match players creation error:', matchPlayersError)
        return NextResponse.json(
          { error: `Failed to assign players: ${matchPlayersError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      match: matchData,
      teamA: teamAData,
      teamB: teamBData
    })

  } catch (error: any) {
    console.error('Match creation API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
