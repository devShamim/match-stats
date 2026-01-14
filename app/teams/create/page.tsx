'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function CreateTeamPage() {
  const { user } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    logo_url: '',
    captain_id: ''
  })
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('user_profile.status', 'approved')

      if (error) throw error
      setPlayers(data || [])
    } catch (error: any) {
      console.error('Error fetching players:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Team name is required', 'error')
      return
    }

    try {
      setLoading(true)
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team')
      }

      showToast('Team created successfully', 'success')
      router.push(`/teams/${data.team.id}`)
    } catch (error: any) {
      console.error('Error creating team:', error)
      showToast(error.message || 'Failed to create team', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/teams">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
      </Link>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Create New Team</CardTitle>
          <CardDescription>Create a persistent team for tournaments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Team Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white mt-1"
                placeholder="Enter team name"
                required
              />
            </div>

            <div>
              <Label htmlFor="color" className="text-white">Team Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 bg-gray-700 border-gray-600"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="logo_url" className="text-white">Logo URL (Optional)</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white mt-1"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <Label htmlFor="captain_id" className="text-white">Captain (Optional)</Label>
              <select
                id="captain_id"
                value={formData.captain_id}
                onChange={(e) => setFormData({ ...formData, captain_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">Select captain</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.user_profile?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
