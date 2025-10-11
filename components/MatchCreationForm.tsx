'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/ui/toast'
import { Player, UserProfile } from '@/types'
import { Calendar, Users, Trophy, MapPin, Clock } from 'lucide-react'

interface MatchFormData {
  type: 'internal' | 'external'
  date: string
  time: string
  opponent: string
  location: string
  teamA_name: string
  teamB_name: string
  teamA_color: string
  teamB_color: string
}

export default function MatchCreationForm() {
  const { showToast } = useToast()
  const [formData, setFormData] = useState<MatchFormData>({
    type: 'internal',
    date: '',
    time: '',
    opponent: '',
    location: '',
    teamA_name: 'Team A',
    teamB_name: 'Team B',
    teamA_color: '#3B82F6',
    teamB_color: '#EF4444'
  })

  const [players, setPlayers] = useState<Array<Player & { user_profile: UserProfile }>>([])
  const [selectedPlayers, setSelectedPlayers] = useState<{
    teamA: string[]
    teamB: string[]
  }>({
    teamA: [],
    teamB: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
    } catch (err: any) {
      console.error('Error fetching players:', err)
    }
  }

  const handleInputChange = (field: keyof MatchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePlayerTeam = (playerId: string, team: 'teamA' | 'teamB') => {
    setSelectedPlayers(prev => {
      const currentTeam = prev[team]
      const otherTeam = team === 'teamA' ? prev.teamB : prev.teamA

      // Remove from other team if exists
      const newOtherTeam = otherTeam.filter(id => id !== playerId)

      // Toggle in current team
      const isSelected = currentTeam.includes(playerId)
      const newCurrentTeam = isSelected
        ? currentTeam.filter(id => id !== playerId)
        : [...currentTeam, playerId]

      return {
        ...prev,
        [team]: newCurrentTeam,
        [team === 'teamA' ? 'teamB' : 'teamA']: newOtherTeam
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      // Call the server-side API route to create the match
      const response = await fetch('/api/create-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          type: formData.type,
          date: formData.date,
          time: formData.time,
          opponent: formData.opponent,
          location: formData.location,
          teamA_name: formData.teamA_name,
          teamB_name: formData.teamB_name,
          teamA_color: formData.teamA_color,
          teamB_color: formData.teamB_color,
          selectedPlayers
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create match')
      }

      setSuccess(true)
      showToast('Match created successfully!', 'success')
    } catch (err: any) {
      console.error('Match creation error:', err)
      const errorMessage = err.message || 'Failed to create match. Please try again.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-600">✅ Match Created Successfully!</CardTitle>
          <CardDescription className="text-center">
            The match has been created and players have been assigned to teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              You can now manage this match from the admin panel.
            </p>
            <Button
              onClick={() => window.location.href = '/admin'}
              className="w-full"
            >
              Back to Admin Panel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create New Match</CardTitle>
        <CardDescription className="text-center">
          Set up a new match and assign players to teams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Match Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="internal">Internal Match</option>
                <option value="external">External Match</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                required
              />
            </div>

            {formData.type === 'external' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opponent *
                </label>
                <Input
                  type="text"
                  placeholder="Enter opponent team name"
                  value={formData.opponent}
                  onChange={(e) => handleInputChange('opponent', e.target.value)}
                  required={formData.type === 'external'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <Input
                type="text"
                placeholder="Enter match location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
          </div>

          {/* Team Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Trophy className="h-5 w-5 mr-2" style={{ color: formData.teamA_color }} />
                {formData.teamA_name} (A)
              </h3>

              <div className="space-y-2">
                <Input
                  placeholder="Team A Name"
                  value={formData.teamA_name}
                  onChange={(e) => handleInputChange('teamA_name', e.target.value)}
                />
                <Input
                  type="color"
                  value={formData.teamA_color}
                  onChange={(e) => handleInputChange('teamA_color', e.target.value)}
                  className="w-full h-10"
                />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Selected Players ({selectedPlayers.teamA.length})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {players
                    .filter(p => selectedPlayers.teamA.includes(p.id))
                    .map(player => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{player.user_profile?.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlayerTeam(player.id, 'teamA')}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Trophy className="h-5 w-5 mr-2" style={{ color: formData.teamB_color }} />
                {formData.teamB_name} (B)
              </h3>

              <div className="space-y-2">
                <Input
                  placeholder="Team B Name"
                  value={formData.teamB_name}
                  onChange={(e) => handleInputChange('teamB_name', e.target.value)}
                />
                <Input
                  type="color"
                  value={formData.teamB_color}
                  onChange={(e) => handleInputChange('teamB_color', e.target.value)}
                  className="w-full h-10"
                />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Selected Players ({selectedPlayers.teamB.length})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {players
                    .filter(p => selectedPlayers.teamB.includes(p.id))
                    .map(player => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{player.user_profile?.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlayerTeam(player.id, 'teamB')}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Available Players */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Available Players ({players.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {players.map(player => {
                const isInTeamA = selectedPlayers.teamA.includes(player.id)
                const isInTeamB = selectedPlayers.teamB.includes(player.id)
                const isSelected = isInTeamA || isInTeamB

                return (
                  <div
                    key={player.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-gray-100 border-gray-300'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{player.user_profile?.name}</p>
                        <p className="text-xs text-gray-500">{player.user_profile?.position}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          type="button"
                          variant={isInTeamA ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePlayerTeam(player.id, 'teamA')}
                          disabled={isInTeamB}
                          className="text-xs"
                        >
                          A
                        </Button>
                        <Button
                          type="button"
                          variant={isInTeamB ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePlayerTeam(player.id, 'teamB')}
                          disabled={isInTeamA}
                          className="text-xs"
                        >
                          B
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Match...' : 'Create Match'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
