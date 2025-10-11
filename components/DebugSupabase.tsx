'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DebugSupabase() {
  const [status, setStatus] = useState('Testing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus('Testing Supabase connection...')
        
        // Test 1: Check if Supabase client is initialized
        if (!supabase) {
          throw new Error('Supabase client not initialized')
        }
        setStatus('✅ Supabase client initialized')

        // Test 2: Try to get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`)
        }
        setStatus('✅ Session check passed')

        // Test 3: Try to fetch players directly from client
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select(`
            *,
            user_profile:user_profiles(*)
          `)
          .limit(1)

        if (playersError) {
          throw new Error(`Players fetch error: ${playersError.message}`)
        }
        
        setStatus(`✅ Success! Found ${players?.length || 0} players`)
        setError(null)
        
      } catch (err: any) {
        setError(err.message)
        setStatus('❌ Connection failed')
        console.error('Debug error:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">🔍 Supabase Debug</h3>
      <p className="text-sm mb-2">Status: {status}</p>
      {error && (
        <div className="text-red-600 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-600">
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
        <p><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      </div>
    </div>
  )
}
