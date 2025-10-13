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
    const { matchId, details } = body

    if (!matchId || !details) {
      return NextResponse.json(
        { error: 'Match ID and details are required' },
        { status: 400 }
      )
    }

    // Update match statistics in matches table
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only update columns that exist (using correct lowercase column names)
    if (details.stats.possession_teamA !== undefined) updateData.possession_teama = details.stats.possession_teamA
    if (details.stats.possession_teamB !== undefined) updateData.possession_teamb = details.stats.possession_teamB
    if (details.stats.shots_teamA !== undefined) updateData.shots_teama = details.stats.shots_teamA
    if (details.stats.shots_teamB !== undefined) updateData.shots_teamb = details.stats.shots_teamB
    if (details.stats.shots_on_target_teamA !== undefined) updateData.shots_on_target_teama = details.stats.shots_on_target_teamA
    if (details.stats.shots_on_target_teamB !== undefined) updateData.shots_on_target_teamb = details.stats.shots_on_target_teamB
    if (details.stats.fouls_teamA !== undefined) updateData.fouls_teama = details.stats.fouls_teamA
    if (details.stats.fouls_teamB !== undefined) updateData.fouls_teamb = details.stats.fouls_teamB
    if (details.match_summary !== undefined) updateData.match_summary = details.match_summary

    const { error: matchError } = await supabaseAdmin()
      .from('matches')
      .update(updateData)
      .eq('id', matchId)

    if (matchError) {
      console.error('Match update error:', matchError)
      return NextResponse.json(
        { error: `Failed to update match: ${matchError.message}` },
        { status: 400 }
      )
    }

    // Delete existing events for this match
    const { error: deleteError } = await supabaseAdmin()
      .from('match_events')
      .delete()
      .eq('match_id', matchId)

    if (deleteError) {
      console.error('Delete events error:', deleteError)
      return NextResponse.json(
        { error: `Failed to clear existing events: ${deleteError.message}` },
        { status: 400 }
      )
    }

    // Insert new events
    const eventsToInsert: any[] = []

    // Add goals
    details.goals.forEach((goal: any) => {
      eventsToInsert.push({
        match_id: matchId,
        event_type: 'goal',
        minute: goal.minute,
        team: goal.team,
        scorer: goal.scorer,
        assist: goal.assist || null
      })
    })

    // Add cards
    details.cards.forEach((card: any) => {
      eventsToInsert.push({
        match_id: matchId,
        event_type: 'card',
        minute: card.minute,
        team: card.team,
        player: card.player,
        card_type: card.type
      })
    })

    // Add substitutions
    details.substitutions.forEach((sub: any) => {
      eventsToInsert.push({
        match_id: matchId,
        event_type: 'substitution',
        minute: sub.minute,
        team: sub.team,
        player_out: sub.playerOut,
        player_in: sub.playerIn
      })
    })

    // Insert all events
    if (eventsToInsert.length > 0) {
      const { error: eventsError } = await supabaseAdmin()
        .from('match_events')
        .insert(eventsToInsert)

      if (eventsError) {
        console.error('Events insert error:', eventsError)
        return NextResponse.json(
          { error: `Failed to save events: ${eventsError.message}` },
          { status: 400 }
        )
      }
    }

    // Get updated match data
    const { data: matchData, error: matchFetchError } = await supabaseAdmin()
      .from('matches')
      .select(`
        *,
        teams(*)
      `)
      .eq('id', matchId)
      .single()

    if (matchFetchError) {
      console.error('Match fetch error:', matchFetchError)
      return NextResponse.json(
        { error: `Failed to fetch updated match: ${matchFetchError.message}` },
        { status: 400 }
      )
    }

    // Automatically assign stats to players based on match events
    try {
      const statsResponse = await fetch(`${request.nextUrl.origin}/api/player-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId })
      })

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json()
        console.log('Stats assigned:', statsResult.message)
      }
    } catch (statsError) {
      console.error('Error assigning stats:', statsError)
      // Don't fail the main request if stats assignment fails
    }

    return NextResponse.json({
      success: true,
      match: matchData
    })

  } catch (error: any) {
    console.error('Match details update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
