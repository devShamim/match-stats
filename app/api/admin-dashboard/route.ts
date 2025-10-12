import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import { verifyAdminAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { error: authError, user } = await verifyAdminAuth(request)
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Fetch all required data in parallel
    const [
      totalPlayersResult,
      pendingPlayersResult,
      totalMatchesResult,
      recentPlayersResult,
      recentMatchesResult,
      recentActivityResult
    ] = await Promise.all([
      // Total approved players
      supabaseAdmin
        .from('players')
        .select(`
          id,
          user_profile:user_profiles!inner(status)
        `, { count: 'exact' })
        .eq('user_profile.status', 'approved'),

      // Pending players
      supabaseAdmin
        .from('players')
        .select(`
          id,
          user_profile:user_profiles!inner(status)
        `, { count: 'exact' })
        .eq('user_profile.status', 'pending'),

      // Total matches
      supabaseAdmin
        .from('matches')
        .select('id', { count: 'exact' }),

      // Recent players (last 5)
      supabaseAdmin
        .from('players')
        .select(`
          id,
          created_at,
          user_profile:user_profiles!inner(name, status)
        `)
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent matches (last 5)
      supabaseAdmin
        .from('matches')
        .select(`
          id,
          type,
          date,
          opponent,
          teamA_name,
          teamB_name,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent activity (combine recent players and matches)
      Promise.all([
        supabaseAdmin
          .from('players')
          .select(`
            id,
            created_at,
            user_profile:user_profiles(name, status)
          `)
          .order('created_at', { ascending: false })
          .limit(3),
        supabaseAdmin
          .from('matches')
          .select(`
            id,
            type,
            opponent,
            teamA_name,
            teamB_name,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(3)
      ])
    ])

    // Handle errors
    if (totalPlayersResult.error) {
      console.error('Error fetching total players:', totalPlayersResult.error)
    }
    if (pendingPlayersResult.error) {
      console.error('Error fetching pending players:', pendingPlayersResult.error)
    }
    if (totalMatchesResult.error) {
      console.error('Error fetching total matches:', totalMatchesResult.error)
    }
    if (recentPlayersResult.error) {
      console.error('Error fetching recent players:', recentPlayersResult.error)
    }
    if (recentMatchesResult.error) {
      console.error('Error fetching recent matches:', recentMatchesResult.error)
    }

    // Process recent activity
    const [recentPlayersActivity, recentMatchesActivity] = recentActivityResult
    const recentActivity: Array<{
      type: string
      message: string
      timestamp: string
      status: string
    }> = []

    // Add recent players to activity
    if (recentPlayersActivity.data) {
      recentPlayersActivity.data.forEach(player => {
        const userProfile = Array.isArray(player.user_profile) ? player.user_profile[0] : player.user_profile
        recentActivity.push({
          type: 'player_registered',
          message: `Player registered: ${userProfile?.name || 'Unknown'}`,
          timestamp: player.created_at,
          status: userProfile?.status || 'unknown'
        })
      })
    }

    // Add recent matches to activity
    if (recentMatchesActivity.data) {
      recentMatchesActivity.data.forEach(match => {
        const matchName = match.type === 'internal'
          ? `${match.teamA_name || 'Team A'} vs ${match.teamB_name || 'Team B'}`
          : `vs ${match.opponent || 'External Team'}`

        recentActivity.push({
          type: 'match_created',
          message: `Match created: ${matchName}`,
          timestamp: match.created_at,
          status: 'completed'
        })
      })
    }

    // Sort activity by timestamp and limit to 5
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    recentActivity.splice(5)

    // Format recent players for display
    const formattedRecentPlayers = recentPlayersResult.data?.map(player => {
      const userProfile = Array.isArray(player.user_profile) ? player.user_profile[0] : player.user_profile
      return {
        id: player.id,
        name: userProfile?.name || 'Unknown',
        status: userProfile?.status || 'unknown',
        createdAt: player.created_at
      }
    }) || []

    // Format recent matches for display
    const formattedRecentMatches = recentMatchesResult.data?.map(match => ({
      id: match.id,
      name: match.type === 'internal'
        ? `${match.teamA_name || 'Team A'} vs ${match.teamB_name || 'Team B'}`
        : `vs ${match.opponent || 'External Team'}`,
      type: match.type,
      status: match.status,
      date: match.date,
      createdAt: match.created_at
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalPlayers: totalPlayersResult.count || 0,
          pendingPlayers: pendingPlayersResult.count || 0,
          totalMatches: totalMatchesResult.count || 0,
          systemStatus: 'Active' // Always active for now
        },
        recentPlayers: formattedRecentPlayers,
        recentMatches: formattedRecentMatches,
        recentActivity: recentActivity
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
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
