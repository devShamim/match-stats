import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET() {
  try {
    // Fetch all data in parallel
    const [
      playersResult,
      matchesResult,
      statsResult
    ] = await Promise.all([
      // Get total players count (approved players)
      supabaseAdmin
        .from('players')
        .select(`
          id,
          user_profile:user_profiles!inner(status)
        `, { count: 'exact' })
        .eq('user_profile.status', 'approved'),

      // Get matches data
      supabaseAdmin
        .from('matches')
        .select('*')
        .order('date', { ascending: false }),

      // Get all stats with player info
      supabaseAdmin
        .from('stats')
        .select(`
          *,
          match_player:match_players(
            *,
            player:players(
              *,
              user_profile:user_profiles(*)
            ),
            match:matches(*)
          )
        `)
    ])

    // Handle errors
    if (playersResult.error) {
      console.error('Error fetching players:', playersResult.error)
      return NextResponse.json({ error: 'Failed to fetch players data' }, { status: 500 })
    }

    if (matchesResult.error) {
      console.error('Error fetching matches:', matchesResult.error)
      return NextResponse.json({ error: 'Failed to fetch matches data' }, { status: 500 })
    }

    if (statsResult.error) {
      console.error('Error fetching stats:', statsResult.error)
      return NextResponse.json({ error: 'Failed to fetch stats data' }, { status: 500 })
    }

    const players = playersResult.data || []
    const matches = matchesResult.data || []
    const stats = statsResult.data || []

    // Calculate total goals from stats
    const totalGoals = stats.reduce((sum, stat) => sum + (stat.goals || 0), 0)

    // Get top scorer
    const playerStatsMap = new Map()
    stats.forEach(stat => {
      if (stat.match_player?.player?.user_profile?.name) {
        const playerName = stat.match_player.player.user_profile.name
        if (!playerStatsMap.has(playerName)) {
          playerStatsMap.set(playerName, { goals: 0, assists: 0 })
        }
        playerStatsMap.get(playerName).goals += stat.goals || 0
        playerStatsMap.get(playerName).assists += stat.assists || 0
      }
    })

    const topScorer = Array.from(playerStatsMap.entries())
      .sort((a, b) => b[1].goals - a[1].goals)[0]

    // Get recent matches (last 3 completed matches)
    const recentMatches = matches
      .filter(match => match.status === 'completed')
      .slice(0, 3)
      .map(match => ({
        id: match.id,
        type: match.type === 'internal' ? 'Internal' : 'External',
        date: match.date,
        teamA: match.teamA_name || 'Team A',
        teamB: match.teamB_name || 'Team B',
        scoreA: match.score_teama || 0,
        scoreB: match.score_teamb || 0
      }))

    // Get upcoming matches (scheduled matches)
    const upcomingMatches = matches
      .filter(match => match.status === 'scheduled')
      .slice(0, 2)
      .map(match => ({
        id: match.id,
        type: match.type === 'internal' ? 'Internal' : 'External',
        date: match.date,
        teamA: match.teamA_name || 'Team A',
        teamB: match.teamB_name || 'Team B',
        location: match.location || 'TBD'
      }))

    // Get top scorers (top 5)
    const topScorers = Array.from(playerStatsMap.entries())
      .sort((a, b) => b[1].goals - a[1].goals)
      .slice(0, 5)
      .map(([name, stats]) => ({
        name,
        goals: stats.goals,
        assists: stats.assists
      }))

    // Get top assisters (top 5)
    const topAssisters = Array.from(playerStatsMap.entries())
      .sort((a, b) => b[1].assists - a[1].assists)
      .slice(0, 5)
      .map(([name, stats]) => ({
        name,
        assists: stats.assists,
        goals: stats.goals
      }))

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers: playersResult.count || 0,
        totalMatches: matches.length,
        totalGoals,
        topScorer: topScorer ? {
          name: topScorer[0],
          goals: topScorer[1].goals
        } : { name: 'No data', goals: 0 },
        recentMatches,
        upcomingMatches,
        topScorers,
        topAssisters
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-cache',
        'Vercel-CDN-Cache-Control': 'no-cache',
        'Cloudflare-CDN-Cache-Control': 'no-cache',
        'X-Cache-Control': 'no-cache',
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Date.now()}"`
      }
    })

  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
