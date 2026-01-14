'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import { PersistentTeam, TeamPlayer } from '@/types'
import { ArrowLeft, Users, Plus, Loader2, Trash2, Edit2, X } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function TeamDetailsPage() {
  const { isAdmin } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const params = useParams()
  const teamId = params?.id as string
  const [team, setTeam] = useState<PersistentTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<any[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [playerStatsMap, setPlayerStatsMap] = useState<Map<string, any>>(new Map())
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    color: '#3B82F6',
    logo_url: '',
    captain_id: ''
  })

  useEffect(() => {
    if (teamId) {
      fetchTeam(teamId)
      fetchAvailablePlayers()
    }
  }, [teamId])

  useEffect(() => {
    if (team?.players && team.players.length > 0) {
      fetchPlayerStatsForTeam()
    }
  }, [team])

  const fetchTeam = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch team')
      }
      const data = await response.json()
      setTeam(data.team)

      // Populate edit form with team data
      if (data.team) {
        setEditFormData({
          name: data.team.name || '',
          color: data.team.color || '#3B82F6',
          logo_url: data.team.logo_url || '',
          captain_id: data.team.captain_id || ''
        })
      }
    } catch (error: any) {
      console.error('Error fetching team:', error)
      showToast('Failed to load team', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailablePlayers = async () => {
    try {
      // Use the API endpoint to fetch players
      const response = await fetch('/api/players')
      if (response.ok) {
        const data = await response.json()
        // Filter to only approved players
        const approvedPlayers = (data.players || []).filter(
          (p: any) => p.user_profile?.status === 'approved'
        )
        setAvailablePlayers(approvedPlayers)
      }
    } catch (error: any) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchPlayerStatsForTeam = async () => {
    if (!team?.players || team.players.length === 0) return

    try {
      const playerIds = team.players.map(tp => tp.player_id)
      const statsMap = new Map<string, any>()

      // Fetch stats for each player
      await Promise.all(
        playerIds.map(async (playerId) => {
          try {
            const response = await fetch(`/api/player-stats?playerId=${playerId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.stats) {
                statsMap.set(playerId, data.stats)
              }
            }
          } catch (error) {
            console.error(`Error fetching stats for player ${playerId}:`, error)
          }
        })
      )

      setPlayerStatsMap(statsMap)
    } catch (error: any) {
      console.error('Error fetching player stats:', error)
    }
  }

  const handleAddPlayer = async (playerId: string, jerseyNumber?: number, position?: string) => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          player_id: playerId,
          jersey_number: jerseyNumber,
          position: position
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add player')
      }

      showToast('Player added to team', 'success')
      setShowAddPlayer(false)
      await fetchTeam(teamId)
      await fetchAvailablePlayers() // Refresh available players list
    } catch (error: any) {
      console.error('Error adding player:', error)
      showToast(error.message || 'Failed to add player', 'error')
    }
  }

  const handleUpdateTeam = async () => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          name: editFormData.name,
          color: editFormData.color,
          logo_url: editFormData.logo_url || null,
          captain_id: editFormData.captain_id || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update team')
      }

      showToast('Team updated successfully', 'success')
      setShowEditModal(false)
      fetchTeam(teamId)
    } catch (error: any) {
      console.error('Error updating team:', error)
      showToast(error.message || 'Failed to update team', 'error')
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to remove this player from the team?')) {
      return
    }

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/teams/${teamId}/players?player_id=${playerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove player')
      }

      showToast('Player removed from team', 'success')
      await fetchTeam(teamId)
      await fetchAvailablePlayers() // Refresh available players list
    } catch (error: any) {
      console.error('Error removing player:', error)
      showToast(error.message || 'Failed to remove player', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Team not found</p>
            <Link href="/teams">
              <Button className="mt-4">Back to Teams</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const teamPlayers = team.players || []
  const playersNotInTeam = availablePlayers.filter(
    p => !teamPlayers.some(tp => tp.player_id === p.id)
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/teams">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
      </Link>

      {/* Team Header */}
      <Card className="bg-white border-gray-200 mb-6 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {team.color && (
                <div
                  className="w-16 h-16 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
              )}
              <div>
                <CardTitle className="text-gray-900 text-2xl">{team.name}</CardTitle>
                {team.captain && (
                  <CardDescription className="text-gray-600">
                    Captain: {team.captain.user_profile?.name || 'N/A'}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-gray-300">
                <Users className="h-3 w-3 mr-1" />
                {teamPlayers.length} Players
              </Badge>
              {isAdmin && (
                <Button
                  onClick={() => setShowEditModal(true)}
                  size="sm"
                  variant="outline"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Team
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Players List */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Team Roster</CardTitle>
            {isAdmin && (
              <Button
                onClick={() => setShowAddPlayer(!showAddPlayer)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showAddPlayer && isAdmin && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-3">Add Player to Team</h3>
              <div className="space-y-2">
                {playersNotInTeam.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <span className="text-gray-900">
                      {player.user_profile?.name || 'Unknown'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAddPlayer(player.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
                {playersNotInTeam.length === 0 && (
                  <p className="text-gray-600">All players are already in this team</p>
                )}
              </div>
            </div>
          )}

          {teamPlayers.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No players in this team yet</p>
          ) : (
            <div className="space-y-2">
              {teamPlayers.map((teamPlayer) => (
                <div
                  key={teamPlayer.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    {teamPlayer.player?.user_profile?.photo_url ? (
                      <img
                        src={teamPlayer.player.user_profile.photo_url}
                        alt={teamPlayer.player.user_profile.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
                        {teamPlayer.player?.user_profile?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        {teamPlayer.player?.user_profile?.name || 'Unknown'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                        {teamPlayer.jersey_number && (
                          <span>#{teamPlayer.jersey_number}</span>
                        )}
                        {teamPlayer.is_captain && (
                          <Badge variant="outline" className="text-xs">Captain</Badge>
                        )}
                      </div>
                      {/* Player Statistics */}
                      {playerStatsMap.has(teamPlayer.player_id) && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                          {(() => {
                            const stats = playerStatsMap.get(teamPlayer.player_id)
                            const position = teamPlayer.position ||
                                           teamPlayer.player?.user_profile?.position ||
                                           teamPlayer.player?.preferred_position ||
                                           'N/A'
                            return (
                              <>
                                <span className="font-medium text-gray-700">{position}</span>
                                <span>•</span>
                                <span>Matches: <span className="font-semibold text-gray-900">{stats.matches_played || 0}</span></span>
                                <span>•</span>
                                <span>Goals: <span className="font-semibold text-gray-900">{stats.total_goals || 0}</span></span>
                                <span>•</span>
                                <span>Assists: <span className="font-semibold text-gray-900">{stats.total_assists || 0}</span></span>
                                <span>•</span>
                                <span>Avg Rating: <span className="font-semibold text-gray-900">{stats.average_rating?.toFixed(1) || '0.0'}</span></span>
                                <span>•</span>
                                <span>Earned Points: <span className="font-semibold text-gray-900">{stats.total_points?.toFixed(1) || '0.0'}</span></span>
                              </>
                            )
                          })()}
                        </div>
                      )}
                      {!playerStatsMap.has(teamPlayer.player_id) && (
                        <div className="text-xs text-gray-400 mt-2">
                          No stats available
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePlayer(teamPlayer.player_id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Team Modal */}
      {showEditModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white border-gray-200 max-w-lg w-full shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900">Edit Team</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit_team_name" className="text-gray-900">Team Name *</Label>
                <Input
                  id="edit_team_name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_team_color" className="text-gray-900">Team Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    id="edit_team_color"
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="w-20 h-10 bg-white border-gray-300"
                  />
                  <Input
                    type="text"
                    value={editFormData.color}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="flex-1 bg-white border-gray-300 text-gray-900"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_team_logo" className="text-gray-900">Logo URL (Optional)</Label>
                <Input
                  id="edit_team_logo"
                  type="url"
                  value={editFormData.logo_url}
                  onChange={(e) => setEditFormData({ ...editFormData, logo_url: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <Label htmlFor="edit_team_captain" className="text-gray-900">Captain (Optional)</Label>
                <select
                  id="edit_team_captain"
                  value={editFormData.captain_id}
                  onChange={(e) => setEditFormData({ ...editFormData, captain_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
                >
                  <option value="">Select captain</option>
                  {teamPlayers.map((teamPlayer) => (
                    <option key={teamPlayer.player_id} value={teamPlayer.player_id}>
                      {teamPlayer.player?.user_profile?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleUpdateTeam}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
