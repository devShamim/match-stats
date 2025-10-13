import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { data: players, error } = await supabaseAdmin()
      .from('players')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching players:', error)
      return NextResponse.json(
        { error: `Failed to fetch players: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      players: players || []
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
    console.error('Players API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
