import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { data: matches, error } = await supabaseAdmin()
      .from('matches')
      .select(`
        *,
        teams(*)
      `)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching matches:', error)
      return NextResponse.json(
        { error: `Failed to fetch matches: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      matches: matches || []
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
    console.error('Matches API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
