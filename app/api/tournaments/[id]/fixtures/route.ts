import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// POST - Generate fixtures for round robin tournament
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    // Get user ID from authorization header
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin().auth.getUser(token)

        if (!userError && user) {
          userId = user.id
        }
      } catch (error) {
        console.log('Could not get user from token:', error)
      }
    }

    // Get tournament
    const { data: tournament } = await supabaseAdmin()
      .from('tournaments')
      .select('type, start_date')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Get registered teams
    const { data: tournamentTeams } = await supabaseAdmin()
      .from('tournament_teams')
      .select('team_id, team:persistent_teams(id, name)')
      .eq('tournament_id', tournamentId)

    if (!tournamentTeams || tournamentTeams.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 teams are required to generate fixtures' },
        { status: 400 }
      )
    }

    // Prevent accidental duplicate fixture generation
    // (without this, repeatedly clicking "Generate Fixtures" will create duplicate matches)
    const { data: existingFixtures, error: existingFixturesError } = await supabaseAdmin()
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('is_fixture', true)
      .eq('round', 'group_stage')
      .limit(1)

    if (existingFixturesError) {
      console.error('Error checking existing fixtures:', existingFixturesError)
      return NextResponse.json(
        { error: 'Failed to check existing fixtures' },
        { status: 500 }
      )
    }

    if (existingFixtures && existingFixtures.length > 0) {
      return NextResponse.json(
        { error: 'Fixtures already generated for this tournament' },
        { status: 409 }
      )
    }

    const teams = tournamentTeams.map(tt => tt.team_id)
    const fixtures: Array<{ teamA: string; teamB: string }> = []

    // Generate fixtures based on tournament type
    if (tournament.type === 'double_round_robin') {
      // Double round robin: each team plays each other twice (home and away)
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          // First leg
          fixtures.push({
            teamA: teams[i],
            teamB: teams[j]
          })
          // Second leg (reverse home/away)
          fixtures.push({
            teamA: teams[j],
            teamB: teams[i]
          })
        }
      }
    } else {
      // Single round robin: each team plays each other once
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          fixtures.push({
            teamA: teams[i],
            teamB: teams[j]
          })
        }
      }
    }

    // Create matches for each fixture
    const matches = []
    const baseDate = tournament.start_date ? new Date(tournament.start_date) : new Date()

    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i]
      const matchDate = new Date(baseDate)
      matchDate.setDate(baseDate.getDate() + i) // Space matches by 1 day

      // Get team names
      // Supabase nested selects may type as array; normalize to a single object.
      const teamAJoined = tournamentTeams.find(tt => tt.team_id === fixture.teamA)?.team as any
      const teamBJoined = tournamentTeams.find(tt => tt.team_id === fixture.teamB)?.team as any
      const teamA = Array.isArray(teamAJoined) ? teamAJoined[0] : teamAJoined
      const teamB = Array.isArray(teamBJoined) ? teamBJoined[0] : teamBJoined

      if (!teamA || !teamB) continue

      // Create match
      const { data: match, error: matchError } = await supabaseAdmin()
        .from('matches')
        .insert({
          type: 'internal',
          date: matchDate.toISOString(),
          status: 'scheduled',
          tournament_id: tournamentId,
          round: 'group_stage',
          is_fixture: true,
          fixture_order: i + 1,
          teamA_name: teamA.name,
          teamB_name: teamB.name,
          created_by: userId || null
        })
        .select()
        .single()

      if (matchError) {
        console.error('Error creating match:', matchError)
        console.error('Match data attempted:', {
          type: 'internal',
          date: matchDate.toISOString(),
          status: 'scheduled',
          tournament_id: tournamentId,
          round: 'group_stage',
          is_fixture: true,
          fixture_order: i + 1,
          teamA_name: teamA.name,
          teamB_name: teamB.name,
          created_by: userId
        })
        continue
      }

      // Create teams for the match
      const { data: teamA_record } = await supabaseAdmin()
        .from('teams')
        .insert({
          match_id: match.id,
          name: teamA.name,
          color: '#3B82F6'
        })
        .select()
        .single()

      const { data: teamB_record } = await supabaseAdmin()
        .from('teams')
        .insert({
          match_id: match.id,
          name: teamB.name,
          color: '#EF4444'
        })
        .select()
        .single()

      if (teamA_record && teamB_record && match) {
        matches.push(match)
      }
    }

    return NextResponse.json({
      success: true,
      fixtures_generated: fixtures.length,
      matches_created: matches.length,
      matches
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
