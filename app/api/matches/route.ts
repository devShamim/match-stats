import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase configuration')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    const { data: matches, error } = await supabaseAdmin
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
    })

  } catch (error: any) {
    console.error('Matches API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
