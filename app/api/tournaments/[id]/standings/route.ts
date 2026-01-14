import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// GET - Get tournament standings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    const { data: standings, error } = await supabaseAdmin()
      .from('tournament_standings')
      .select(`
        *,
        team:persistent_teams(
          *,
          captain:players!persistent_teams_captain_id_fkey(
            *,
            user_profile:user_profiles(*)
          )
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('points', { ascending: false })
      .order('goal_difference', { ascending: false })
      .order('goals_for', { ascending: false })

    if (error) {
      console.error('Error fetching standings:', error)
      return NextResponse.json(
        { error: `Failed to fetch standings: ${error.message}` },
        { status: 400 }
      )
    }

    // Calculate positions
    const standingsWithPositions = (standings || []).map((standing, index) => ({
      ...standing,
      position: index + 1
    }))

    return NextResponse.json({ standings: standingsWithPositions })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Recalculate standings (called after match completion)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id

    // Get all completed matches for this tournament
    const { data: matches } = await supabaseAdmin()
      .from('matches')
      .select(`
        id,
        score_teama,
        score_teamb,
        teamA_name,
        teamB_name
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')

    // If no completed matches, just return success with empty standings
    if (!matches || matches.length === 0) {
      console.log(`No completed matches found for tournament ${tournamentId}`)
      return NextResponse.json({ success: true, message: 'No completed matches to calculate standings from' })
    }

    console.log(`Found ${matches.length} completed matches for tournament ${tournamentId}`)

    // Get all tournament teams
    const { data: tournamentTeams } = await supabaseAdmin()
      .from('tournament_teams')
      .select('team_id, team:persistent_teams(id, name)')
      .eq('tournament_id', tournamentId)

    if (!tournamentTeams || tournamentTeams.length === 0) {
      return NextResponse.json(
        { error: 'No teams found in tournament' },
        { status: 400 }
      )
    }

    // Initialize standings map
    const standingsMap = new Map<string, {
      matches_played: number
      wins: number
      draws: number
      losses: number
      goals_for: number
      goals_against: number
    }>()

    tournamentTeams.forEach(tt => {
      standingsMap.set(tt.team_id, {
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0
      })
    })

    // Calculate standings from matches
    for (const match of matches) {
      // Use teamA_name and teamB_name directly from matches table
      const teamA_name = match.teamA_name
      const teamB_name = match.teamB_name

      if (!teamA_name || !teamB_name) {
        console.warn('Match missing team names:', match.id)
        continue
      }

      const normalizeName = (name: string) => name.toLowerCase().trim()
      const getTournamentTeamName = (tt: any) => {
        // Supabase nested select may type as array; normalize.
        const teamJoined = tt?.team
        const teamObj = Array.isArray(teamJoined) ? teamJoined[0] : teamJoined
        return teamObj?.name ? normalizeName(teamObj.name) : null
      }

      // Find which persistent team this match team belongs to by name (case-insensitive, trimmed)
      const teamA_persistent = tournamentTeams.find(tt =>
        getTournamentTeamName(tt) === normalizeName(teamA_name)
      )
      const teamB_persistent = tournamentTeams.find(tt =>
        getTournamentTeamName(tt) === normalizeName(teamB_name)
      )

      if (!teamA_persistent || !teamB_persistent) {
        console.warn(`Could not find persistent teams for match ${match.id}:`, {
          teamA_name,
          teamB_name,
          availableTeams: tournamentTeams.map((tt: any) => ({
            id: tt.team_id,
            name: (() => {
              const teamJoined = tt?.team
              const teamObj = Array.isArray(teamJoined) ? teamJoined[0] : teamJoined
              return teamObj?.name || null
            })()
          }))
        })
        continue
      }

      const teamA_id = teamA_persistent.team_id
      const teamB_id = teamB_persistent.team_id

      // Use correct column names (score_teama, score_teamb)
      const scoreA = Number(match.score_teama) || 0
      const scoreB = Number(match.score_teamb) || 0

      console.log(`Processing match ${match.id}: ${teamA_name} (${scoreA}) vs ${teamB_name} (${scoreB})`)

      // Update team A stats
      const statsA = standingsMap.get(teamA_id)!
      statsA.matches_played++
      statsA.goals_for += scoreA
      statsA.goals_against += scoreB

      // Update team B stats
      const statsB = standingsMap.get(teamB_id)!
      statsB.matches_played++
      statsB.goals_for += scoreB
      statsB.goals_against += scoreA

      // Determine result
      if (scoreA > scoreB) {
        statsA.wins++
        statsB.losses++
      } else if (scoreB > scoreA) {
        statsB.wins++
        statsA.losses++
      } else {
        statsA.draws++
        statsB.draws++
      }
    }

    // Get tournament settings (points and type)
    const { data: tournament } = await supabaseAdmin()
      .from('tournaments')
      .select('points_per_win, points_per_draw, points_per_loss, type, id')
      .eq('id', tournamentId)
      .single()

    const pointsPerWin = tournament?.points_per_win || 3
    const pointsPerDraw = tournament?.points_per_draw || 1
    const pointsPerLoss = tournament?.points_per_loss || 0

    // Update standings in database
    console.log(`Updating standings for ${standingsMap.size} teams`)
    // Avoid downlevelIteration requirement by iterating an array snapshot of entries
    for (const [teamId, stats] of Array.from(standingsMap.entries())) {
      const points = (stats.wins * pointsPerWin) + (stats.draws * pointsPerDraw) + (stats.losses * pointsPerLoss)
      const goalDifference = stats.goals_for - stats.goals_against

      console.log(`Updating standings for team ${teamId}:`, {
        matches_played: stats.matches_played,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goals_for: stats.goals_for,
        goals_against: stats.goals_against,
        goal_difference: goalDifference,
        points: points
      })

      // First, try to find existing standings record.
      // Use maybeSingle() so "no rows" is not treated as an error.
      const { data: existingStanding, error: existingStandingError } = await supabaseAdmin()
        .from('tournament_standings')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('team_id', teamId)
        .is('group_name', null)
        .maybeSingle()

      if (existingStandingError) {
        console.error(
          `Error checking existing standings for team ${teamId}:`,
          existingStandingError
        )
      }

      if (existingStanding) {
        // Update existing record
        const { error: updateError } = await supabaseAdmin()
          .from('tournament_standings')
          .update({
            matches_played: stats.matches_played,
            wins: stats.wins,
            draws: stats.draws,
            losses: stats.losses,
            goals_for: stats.goals_for,
            goals_against: stats.goals_against,
            goal_difference: goalDifference,
            points: points,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStanding.id)

        if (updateError) {
          console.error(`Error updating standings for team ${teamId}:`, updateError)
        } else {
          console.log(`Successfully updated standings for team ${teamId}`)
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabaseAdmin()
          .from('tournament_standings')
          .insert({
            tournament_id: tournamentId,
            team_id: teamId,
            group_name: null, // Ensure group_name is null for round robin
            matches_played: stats.matches_played,
            wins: stats.wins,
            draws: stats.draws,
            losses: stats.losses,
            goals_for: stats.goals_for,
            goals_against: stats.goals_against,
            goal_difference: goalDifference,
            points: points,
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`Error inserting standings for team ${teamId}:`, insertError)
        } else {
          console.log(`Successfully inserted standings for team ${teamId}`)
        }
      }
    }

    // Check if all group stage matches are completed and generate final if needed

    if (tournament && (tournament.type === 'round_robin' || tournament.type === 'double_round_robin')) {
      // Get all group stage matches
      const { data: groupMatches } = await supabaseAdmin()
        .from('matches')
        .select('id, status, round')
        .eq('tournament_id', tournamentId)
        .eq('round', 'group_stage')

      // Check if all group stage matches are completed
      const allGroupMatchesCompleted = groupMatches?.every(m => m.status === 'completed') || false
      const totalGroupMatches = groupMatches?.length || 0

      // Check if final already exists
      const { data: existingFinal } = await supabaseAdmin()
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('round', 'final')
        .limit(1)

      // Generate final if all group matches are done and no final exists
      if (allGroupMatchesCompleted && totalGroupMatches > 0 && !existingFinal?.length) {
        // Get top 2 teams from standings
        const { data: topTeams } = await supabaseAdmin()
          .from('tournament_standings')
          .select(`
            team_id,
            team:persistent_teams(id, name),
            points,
            goal_difference,
            goals_for
          `)
          .eq('tournament_id', tournamentId)
          .order('points', { ascending: false })
          .order('goal_difference', { ascending: false })
          .order('goals_for', { ascending: false })
          .limit(2)

        if (topTeams && topTeams.length === 2) {
          // Supabase nested selects may type as arrays; normalize to a single object.
          const teamAJoined = (topTeams[0] as any).team
          const teamBJoined = (topTeams[1] as any).team
          const teamA = Array.isArray(teamAJoined) ? teamAJoined[0] : teamAJoined
          const teamB = Array.isArray(teamBJoined) ? teamBJoined[0] : teamBJoined

          if (teamA && teamB) {
            // Get the last match date to schedule final after it
            const { data: lastMatch } = await supabaseAdmin()
              .from('matches')
              .select('date')
              .eq('tournament_id', tournamentId)
              .order('date', { ascending: false })
              .limit(1)
              .single()

            const finalDate = lastMatch?.date
              ? new Date(new Date(lastMatch.date).getTime() + 24 * 60 * 60 * 1000) // 1 day after last match
              : new Date()

            // Get user ID for created_by (try to get from first match)
            const { data: firstMatch } = await supabaseAdmin()
              .from('matches')
              .select('created_by')
              .eq('tournament_id', tournamentId)
              .limit(1)
              .single()

            // Create final match
            const { data: finalMatch, error: finalError } = await supabaseAdmin()
              .from('matches')
              .insert({
                type: 'internal',
                date: finalDate.toISOString(),
                status: 'scheduled',
                tournament_id: tournamentId,
                round: 'final',
                is_fixture: true,
                fixture_order: 999, // High number to appear last
                teamA_name: teamA.name,
                teamB_name: teamB.name,
                created_by: firstMatch?.created_by || null
              })
              .select()
              .single()

            if (!finalError && finalMatch) {
              // Create teams for the final match
              await supabaseAdmin()
                .from('teams')
                .insert([
                  {
                    match_id: finalMatch.id,
                    name: teamA.name,
                    color: '#3B82F6'
                  },
                  {
                    match_id: finalMatch.id,
                    name: teamB.name,
                    color: '#EF4444'
                  }
                ])
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Standings recalculated' })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
