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
    const { matchId, score_teamA, score_teamB, status } = body

    // Validate required fields
    if (!matchId || score_teamA === undefined || score_teamB === undefined || !status) {
      return NextResponse.json(
        { error: 'Match ID, scores, and status are required' },
        { status: 400 }
      )
    }

    // Validate score values
    if (score_teamA < 0 || score_teamB < 0) {
      return NextResponse.json(
        { error: 'Scores cannot be negative' },
        { status: 400 }
      )
    }

    // Update match record with scores
    const { data: matchData, error: matchError } = await supabaseAdmin()
      .from('matches')
      .update({
        score_teama: parseInt(score_teamA),
        score_teamb: parseInt(score_teamB),
        status,
        updated_at: new Date().toISOString()
      })
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

    // If match is completed and belongs to a tournament, recalculate standings
    // This will also automatically generate a final match if all group stage matches are done
    if (status === 'completed' && matchData?.tournament_id) {
      try {
        // Get the base URL from the request
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`

        await fetch(`${baseUrl}/api/tournaments/${matchData.tournament_id}/standings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        console.error('Error recalculating tournament standings:', error)
        // Don't fail the match update if standings recalculation fails
      }
    }

    return NextResponse.json({
      success: true,
      match: matchData
    })

  } catch (error: any) {
    console.error('Match score update API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
