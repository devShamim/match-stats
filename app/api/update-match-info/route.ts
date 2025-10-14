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
    const {
      matchId,
      date,
      location,
      opponent,
      type,
      status,
      score_teamA,
      score_teamB,
      teamA_name,
      teamB_name,
      match_summary
    } = body

    // Validate required fields
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (date !== undefined) updateData.date = date
    if (location !== undefined) updateData.location = location
    if (opponent !== undefined) updateData.opponent = opponent
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (score_teamA !== undefined) updateData.score_teama = parseInt(score_teamA)
    if (score_teamB !== undefined) updateData.score_teamb = parseInt(score_teamB)
    if (teamA_name !== undefined) updateData.teamA_name = teamA_name
    if (teamB_name !== undefined) updateData.teamB_name = teamB_name
    if (match_summary !== undefined) updateData.match_summary = match_summary

    // Update match record
    const { data: matchData, error: matchError } = await supabaseAdmin()
      .from('matches')
      .update(updateData)
      .eq('id', matchId)
      .select(`
        *,
        teams(*)
      `)
      .single()

    if (matchError) {
      console.error('Match update error:', matchError)
      return NextResponse.json(
        { error: `Failed to update match: ${matchError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      match: matchData
    })

  } catch (error: any) {
    console.error('Match info update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
