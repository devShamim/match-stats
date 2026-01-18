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
import { Tournament, TournamentStanding, PersistentTeam } from '@/types'
import { ArrowLeft, Trophy, Users, Calendar, Loader2, Plus, Play, Table, Edit2, Settings, X, Clock, Award, Target, Star, Zap, Trash2, TrendingUp, Save } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function TournamentDetailsPage() {
  const { isAdmin } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const params = useParams()
  const tournamentId = params?.id as string
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<TournamentStanding[]>([])
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [prizes, setPrizes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [availableTeams, setAvailableTeams] = useState<PersistentTeam[]>([])
  const [showRegisterTeam, setShowRegisterTeam] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGenerateFixturesModal, setShowGenerateFixturesModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingFixtures, setGeneratingFixtures] = useState(false)
  const [recalculatingStandings, setRecalculatingStandings] = useState(false)
  const [playerStatsTab, setPlayerStatsTab] = useState<'top_scorers' | 'assists' | 'ratings' | 'mvp' | 'most_saves' | 'top_performers'>('top_scorers')
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    type: 'round_robin' as 'round_robin' | 'knockout' | 'hybrid' | 'double_round_robin',
    start_date: '',
    end_date: '',
    max_teams: '',
    min_players_per_team: '5',
    max_players_per_team: '6',
    points_per_win: '3',
    points_per_draw: '1',
    points_per_loss: '0'
  })

  useEffect(() => {
    if (tournamentId) {
      fetchTournament(tournamentId)
      fetchAvailableTeams()
    }
  }, [tournamentId])

  const fetchTournament = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tournament')
      }
      const data = await response.json()
      setTournament(data.tournament)
      setStandings(data.tournament.standings || [])
      setTournamentMatches(data.tournament.matches || [])

      // Fetch player statistics and prizes if there are completed matches
      if (data.tournament.matches?.some((m: any) => m.status === 'completed')) {
        fetchPlayerStats(id)
        fetchPrizes(id)
      }

      // Populate edit form with tournament data
      if (data.tournament) {
        setEditFormData({
          name: data.tournament.name || '',
          description: data.tournament.description || '',
          type: data.tournament.type || 'round_robin',
          start_date: data.tournament.start_date ? new Date(data.tournament.start_date).toISOString().split('T')[0] : '',
          end_date: data.tournament.end_date ? new Date(data.tournament.end_date).toISOString().split('T')[0] : '',
          max_teams: data.tournament.max_teams?.toString() || '',
          min_players_per_team: data.tournament.min_players_per_team?.toString() || '5',
          max_players_per_team: data.tournament.max_players_per_team?.toString() || '6',
          points_per_win: data.tournament.points_per_win?.toString() || '3',
          points_per_draw: data.tournament.points_per_draw?.toString() || '1',
          points_per_loss: data.tournament.points_per_loss?.toString() || '0'
        })
      }
    } catch (error: any) {
      console.error('Error fetching tournament:', error)
      showToast('Failed to load tournament', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayerStats = async (id: string) => {
    try {
      const response = await fetch(`/api/tournaments/${id}/player-stats`)
      if (response.ok) {
        const data = await response.json()
        console.log('Player stats data:', data)
        setPlayerStats(data.playerStats || [])
      } else {
        console.error('Failed to fetch player stats:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
    }
  }

  const fetchPrizes = async (id: string) => {
    try {
      const response = await fetch(`/api/tournaments/${id}/prizes`)
      if (response.ok) {
        const data = await response.json()
        setPrizes(data.prizes || [])
      }
    } catch (error) {
      console.error('Error fetching prizes:', error)
    }
  }

  const handleCalculatePrizes = async () => {
    if (!tournamentId) return

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/prizes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate prizes')
      }

      showToast(`Prizes calculated successfully! ${data.prizes_awarded} prizes awarded.`, 'success')
      await fetchPrizes(tournamentId)
    } catch (error: any) {
      console.error('Error calculating prizes:', error)
      showToast(error.message || 'Failed to calculate prizes', 'error')
    }
  }

  const handleSetPlayerOfTournament = async (playerId: string, teamId: string | null) => {
    if (!tournamentId) return

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/prizes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({ player_id: playerId, team_id: teamId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set Player of the Tournament')
      }

      showToast('Player of the Tournament updated successfully', 'success')
      await fetchPrizes(tournamentId)
    } catch (error: any) {
      console.error('Error setting Player of the Tournament:', error)
      showToast(error.message || 'Failed to set Player of the Tournament', 'error')
    }
  }

  const fetchAvailableTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setAvailableTeams(data.teams || [])
      }
    } catch (error: any) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleRegisterTeam = async (teamId: string) => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({ team_id: teamId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register team')
      }

      showToast('Team registered successfully', 'success')
      setShowRegisterTeam(false)
      fetchTournament(tournamentId)
    } catch (error: any) {
      console.error('Error registering team:', error)
      showToast(error.message || 'Failed to register team', 'error')
    }
  }

  const handleUpdateTournament = async () => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          name: editFormData.name,
          description: editFormData.description || null,
          type: editFormData.type,
          start_date: editFormData.start_date ? new Date(editFormData.start_date).toISOString() : null,
          end_date: editFormData.end_date ? new Date(editFormData.end_date).toISOString() : null,
          max_teams: editFormData.max_teams ? parseInt(editFormData.max_teams) : null,
          min_players_per_team: parseInt(editFormData.min_players_per_team),
          max_players_per_team: parseInt(editFormData.max_players_per_team),
          points_per_win: parseInt(editFormData.points_per_win),
          points_per_draw: parseInt(editFormData.points_per_draw),
          points_per_loss: parseInt(editFormData.points_per_loss)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tournament')
      }

      showToast('Tournament updated successfully', 'success')
      setShowEditModal(false)
      fetchTournament(tournamentId)
    } catch (error: any) {
      console.error('Error updating tournament:', error)
      showToast(error.message || 'Failed to update tournament', 'error')
    }
  }

  const handleDeleteTournament = async () => {
    try {
      setDeleting(true)
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tournament')
      }

      showToast('Tournament and all related data deleted successfully', 'success')
      router.push('/tournaments')
    } catch (error: any) {
      console.error('Error deleting tournament:', error)
      showToast(error.message || 'Failed to delete tournament', 'error')
      setDeleting(false)
    }
  }

  const handleGenerateFixtures = async () => {
    setShowGenerateFixturesModal(true)
  }

  const handleRecalculateStandings = async () => {
    if (!tournamentId) return

    setRecalculatingStandings(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/standings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate standings')
      }

      showToast('Standings recalculated successfully!', 'success')
      // Refresh tournament data and player stats after a short delay to ensure database is updated
      setTimeout(async () => {
        await fetchTournament(tournamentId)
        if (tournamentMatches.some(m => m.status === 'completed')) {
          await fetchPlayerStats(tournamentId)
        }
      }, 500)
    } catch (error: any) {
      console.error('Error recalculating standings:', error)
      showToast(error.message || 'Failed to recalculate standings', 'error')
    } finally {
      setRecalculatingStandings(false)
    }
  }

  const confirmGenerateFixtures = async () => {
    setShowGenerateFixturesModal(false)
    setGeneratingFixtures(true)

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/fixtures`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate fixtures')
      }

      showToast(`Generated ${data.fixtures_generated} fixtures successfully!`, 'success')
      // Refresh tournament data to show the new matches
      await fetchTournament(tournamentId)
    } catch (error: any) {
      console.error('Error generating fixtures:', error)
      showToast(error.message || 'Failed to generate fixtures', 'error')
    } finally {
      setGeneratingFixtures(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400'
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400'
      case 'registration':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'draft':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const splitAwardDescription = (desc?: string) => {
    const d = String(desc || '').trim()
    const idx = d.indexOf('(')
    if (idx > 0) {
      return {
        title: d.slice(0, idx).trim(),
        meta: d.slice(idx).trim()
      }
    }
    return { title: d || 'Award', meta: '' }
  }

  // Calculate unified score and MVP (goals + assists) for player stats
  const calculatePlayerStatsWithScores = () => {
    // Unified Scoring System Constants (same as prizes calculation)
    const GOALS_POINT = 3
    const ASSIST_POINT = 2
    const SAVES_POINT = 0.5
    const CLEAN_SHEET_POINT_DEFENDER = 3
    const CLEAN_SHEET_POINT_OTHER = 2
    const RATING_MULTIPLIER_DEFENDER = 2.6
    const RATING_MULTIPLIER_OTHER = 2

    const isDefender = (position: string | null | undefined): boolean => {
      if (!position) return false
      const pos = position.toLowerCase()
      return pos.includes('defender') ||
             pos.includes('cb') ||
             pos.includes('lb') ||
             pos.includes('rb') ||
             pos.includes('lwb') ||
             pos.includes('rwb') ||
             pos.includes('sw') ||
             pos.includes('cdm') ||
             pos.includes('dm')
    }

    return playerStats.map(player => {
      const goalContributions = (player.goals || 0) + (player.assists || 0)
      const isPlayerDefender = isDefender((player as any).position)

      // Calculate unified score
      const goalsPoints = (player.goals || 0) * GOALS_POINT
      const assistsPoints = (player.assists || 0) * ASSIST_POINT
      const savesPoints = (player.saves || 0) * SAVES_POINT
      const cleanSheetsPoints = isPlayerDefender
        ? (player.clean_sheets || 0) * CLEAN_SHEET_POINT_DEFENDER
        : (player.clean_sheets || 0) * CLEAN_SHEET_POINT_OTHER
      const ratingMultiplier = isPlayerDefender ? RATING_MULTIPLIER_DEFENDER : RATING_MULTIPLIER_OTHER
      const matchRatingPoints = (player.average_rating || 0) * ratingMultiplier
      const unifiedScore = Math.round((goalsPoints + assistsPoints + savesPoints + cleanSheetsPoints + matchRatingPoints) * 10) / 10

      return {
        ...player,
        goal_contributions: goalContributions,
        unified_score: unifiedScore
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="container mx-auto px-4 py-6">
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Tournament not found</p>
              <Link href="/tournaments">
                <Button className="mt-4">Back to Tournaments</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const registeredTeamIds = tournament.teams?.map(t => t.team_id) || []
  const teamsNotRegistered = availableTeams.filter(t => !registeredTeamIds.includes(t.id))

  // Find final match and winner
  // Only treat a match as "final" if its round is explicitly marked as 'final'.
  // (Previously we fell back to the last match in the list, which made the UI
  //  show a fake Championship Match immediately after generating group fixtures.)
  const finalMatch = tournamentMatches.find((m: any) => m.round === 'final') || null

  let finalWinner: string | null = null
  if (finalMatch && finalMatch.status === 'completed') {
    const scoreA = (finalMatch as any).score_teama || 0
    const scoreB = (finalMatch as any).score_teamb || 0
    if (scoreA > scoreB) {
      finalWinner = finalMatch.teamA_name
    } else if (scoreB > scoreA) {
      finalWinner = finalMatch.teamB_name
    } else {
      finalWinner = 'Draw'
    }
  }

  const groupMatches = tournamentMatches.filter((m: any) => m.round !== 'final')
  const showFinalPlaceholder =
    !finalMatch &&
    tournament.type === 'double_round_robin' &&
    groupMatches.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="container mx-auto px-4 py-6">
        <Link href="/tournaments">
          <Button variant="ghost" className="mb-4 text-gray-700 hover:text-gray-900 hover:bg-white/50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </Link>

        {/* Hero Section with Tournament Name */}
        <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 shadow-2xl">
          <div className="absolute inset-0 bg-black/10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12"></div>
          </div>
          <div className="relative px-6 py-8 sm:px-8 sm:py-12">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-300" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                      {tournament.name}
                    </h1>
                    <Badge className={`${getStatusColor(tournament.status)} bg-white/20 backdrop-blur-sm border-white/30 text-white`}>
                      {tournament.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {tournament.description && (
                  <p className="text-white/90 text-base sm:text-lg mb-4 max-w-2xl">
                    {tournament.description}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 text-white/90">
                  <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Trophy className="h-5 w-5" />
                    <span className="font-medium">{tournament.type.replace('_', ' ')}</span>
                  </div>
                  <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">{tournament.teams?.length || 0} Teams</span>
                  </div>
                  {tournament.start_date && (
                    <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">{new Date(tournament.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {tournament.status === 'draft' && (
                    <Button
                      onClick={async () => {
                        const session = await supabase.auth.getSession()
                        if (!session.data.session) {
                          showToast('You must be logged in', 'error')
                          return
                        }
                        await fetch(`/api/tournaments/${tournamentId}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.data.session.access_token}`
                          },
                          body: JSON.stringify({ status: 'registration' })
                        })
                        fetchTournament(tournamentId)
                      }}
                      size="sm"
                      className="w-full sm:w-auto bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                    >
                      Open Registration
                    </Button>
                  )}
                  {tournament.status === 'registration' && (
                    <Button
                      onClick={async () => {
                        const session = await supabase.auth.getSession()
                        if (!session.data.session) {
                          showToast('You must be logged in', 'error')
                          return
                        }
                        await fetch(`/api/tournaments/${tournamentId}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.data.session.access_token}`
                          },
                          body: JSON.stringify({ status: 'in_progress' })
                        })
                        showToast('Registration closed', 'success')
                        fetchTournament(tournamentId)
                      }}
                      size="sm"
                      className="w-full sm:w-auto bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                    >
                      Close Registration
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowEditModal(true)}
                    size="sm"
                    className="w-full sm:w-auto bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    size="sm"
                    className="w-full sm:w-auto bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-white border-red-300/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Winner Banner - If Final is Completed */}
        {finalWinner && finalMatch && (
          <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 shadow-2xl">
            <div className="absolute inset-0 bg-black/10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12"></div>
            </div>
            <div className="relative px-8 py-10 text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Trophy className="h-12 w-12 text-white drop-shadow-lg" />
                <div>
                  <div className="text-white/90 text-sm font-medium mb-1">TOURNAMENT CHAMPION</div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                    {finalWinner}
                  </h2>
                </div>
                <Trophy className="h-12 w-12 text-white drop-shadow-lg" />
              </div>
              <div className="text-white/90 text-lg">
                Final Score: {(finalMatch as any).score_teama || 0} - {(finalMatch as any).score_teamb || 0}
              </div>
            </div>
          </div>
        )}

        {/* Final Match Highlight */}
        {finalMatch && !finalWinner && (
          <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
            <div className="absolute inset-0 bg-black/10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"></div>
            </div>
            <div className="relative px-8 py-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Trophy className="h-6 w-6 text-yellow-300" />
                </div>
                <div>
                  <div className="text-white/90 text-sm font-medium mb-1">GRAND FINAL</div>
                  <h3 className="text-2xl font-bold text-white">Championship Match</h3>
                </div>
              </div>
              <Link href={`/matches/${finalMatch.id}`} className="block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all cursor-pointer border border-white/20">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-center flex-1">
                          <div className="text-2xl font-bold text-white mb-1">{finalMatch.teamA_name || 'Team A'}</div>
                          {finalMatch.status === 'completed' && (
                            <div className="text-lg text-white/80">{(finalMatch as any).score_teama || 0}</div>
                          )}
                        </div>
                        <div className="text-white/80 text-xl font-bold">VS</div>
                        <div className="text-center flex-1">
                          <div className="text-2xl font-bold text-white mb-1">{finalMatch.teamB_name || 'Team B'}</div>
                          {finalMatch.status === 'completed' && (
                            <div className="text-lg text-white/80">{(finalMatch as any).score_teamb || 0}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-white/80 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(finalMatch.date).toLocaleDateString()}</span>
                        </div>
                        <Badge className={`${
                          finalMatch.status === 'completed' ? 'bg-green-500/30 text-white border-green-300/50' :
                          finalMatch.status === 'in_progress' ? 'bg-blue-500/30 text-white border-blue-300/50' :
                          'bg-white/20 text-white border-white/30'
                        }`}>
                          {finalMatch.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Final Match Placeholder (before final is actually scheduled) */}
        {showFinalPlaceholder && (
          <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
            <div className="absolute inset-0 bg-black/10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"></div>
            </div>
            <div className="relative px-8 py-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Trophy className="h-6 w-6 text-yellow-300" />
                </div>
                <div>
                  <div className="text-white/90 text-sm font-medium mb-1">GRAND FINAL</div>
                  <h3 className="text-2xl font-bold text-white">Championship Match</h3>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-sm uppercase tracking-wide text-white/70 mb-1">1st Place</div>
                    <div className="text-2xl font-bold text-white mb-1">Standings</div>
                  </div>
                  <div className="text-white/80 text-xl font-bold">VS</div>
                  <div className="flex-1 text-center">
                    <div className="text-sm uppercase tracking-wide text-white/70 mb-1">2nd Place</div>
                    <div className="text-2xl font-bold text-white mb-1">Standings</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-white/80">
                  Final will be scheduled automatically once all fixtures are completed and standings are recalculated.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Header - Desktop only (mobile uses the hero) */}
        <Card className="hidden md:block bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-6 rounded-2xl">
          <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-gray-900 text-2xl">{tournament.name}</CardTitle>
                <Badge className={getStatusColor(tournament.status)}>
                  {tournament.status.replace('_', ' ')}
                </Badge>
              </div>
              {tournament.description && (
                <CardDescription className="text-gray-600">
                  {tournament.description}
                </CardDescription>
              )}
              <div className="flex gap-4 mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{tournament.type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{tournament.teams?.length || 0} Teams</span>
                </div>
                {tournament.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {tournament.status === 'draft' && (
                  <Button
                    onClick={() => {
                      const session = supabase.auth.getSession().then(s => {
                        if (s.data.session) {
                          fetch(`/api/tournaments/${tournamentId}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${s.data.session.access_token}`
                            },
                            body: JSON.stringify({ status: 'registration' })
                          }).then(() => fetchTournament(tournamentId))
                        }
                      })
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Open Registration
                  </Button>
                )}
                <Button
                  onClick={() => setShowEditModal(true)}
                  size="sm"
                  variant="outline"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Tournament
                </Button>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tournament
                </Button>
              </div>
            )}
          </div>
          </CardHeader>
        </Card>

      {/* Registered Teams */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-6 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Registered Teams</CardTitle>
            {isAdmin && (tournament.status === 'draft' || tournament.status === 'registration') && (
              <Button
                onClick={() => setShowRegisterTeam(!showRegisterTeam)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register Team
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showRegisterTeam && isAdmin && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-3">Register Team</h3>
              {teamsNotRegistered.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm mb-3">Select a team to register:</p>
                  {teamsNotRegistered.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {team.color && (
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        <span className="text-gray-900 font-medium">{team.name}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRegisterTeam(team.id)}
                      >
                        Register
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">All available teams are already registered in this tournament.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    <Link href="/teams/create" className="text-blue-600 hover:underline">
                      Create a new team
                    </Link> to register it.
                  </p>
                </div>
              )}
            </div>
          )}

          {tournament.teams && tournament.teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.teams.map((tournamentTeam) => (
                <Link
                  key={tournamentTeam.id}
                  href={`/teams/${tournamentTeam.team_id}`}
                  aria-label={`View team ${tournamentTeam.team?.name || 'details'}`}
                  className="block"
                >
                  <div className="p-4 bg-gradient-to-br from-white to-blue-50 rounded-xl border border-blue-200/50 hover:shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {tournamentTeam.team?.color && (
                          <div
                            className="w-5 h-5 rounded-full shadow-md ring-2 ring-white shrink-0"
                            style={{ backgroundColor: tournamentTeam.team.color }}
                          />
                        )}
                        <span className="text-gray-900 font-semibold text-lg truncate">
                          {tournamentTeam.team?.name || 'Unknown Team'}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm text-gray-500 shrink-0">
                        {tournamentTeam.team?.captain?.user_profile?.name
                          ? `C: ${tournamentTeam.team.captain.user_profile.name}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No teams registered yet</p>
          )}

          {/* Show fixture generation when we have enough teams and NO fixtures yet.
              Previously this was limited to `status === 'registration'`, which made the button "disappear"
              in draft/in_progress tournaments even when fixtures hadn't been generated. */}
          {isAdmin && tournament.teams && tournament.teams.length >= 2 && groupMatches.length === 0 && (
            <div className="mt-6">
              <Button
                onClick={handleGenerateFixtures}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                disabled={generatingFixtures}
                size="lg"
              >
                {generatingFixtures ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Fixtures...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Generate Fixtures
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournament Matches - Group Stage */}
      {groupMatches.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-6 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fixtures & Matches
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                {groupMatches.length} {groupMatches.length === 1 ? 'match' : 'matches'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupMatches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="block">
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50 hover:from-blue-100 hover:to-purple-100 transition-all cursor-pointer shadow-sm hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900 text-base sm:text-lg truncate">
                            {match.teamA_name || 'Team A'}
                          </span>
                          <span className="text-gray-500 font-semibold">vs</span>
                          <span className="font-bold text-gray-900 text-base sm:text-lg truncate">
                            {match.teamB_name || 'Team B'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(match.date).toLocaleDateString()}</span>
                          </div>
                          {match.round && (
                            <Badge variant="outline" className="text-xs bg-white/50 whitespace-nowrap">
                              {match.round.replace('_', ' ')}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs whitespace-nowrap ${
                              match.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                              match.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                              'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            {match.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-right self-end sm:self-auto">
                        {match.status === 'completed' ? (
                          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {(match as any).score_teama || match.score_teamA || 0} - {(match as any).score_teamb || match.score_teamB || 0}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 font-medium">
                            {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Score (summary at bottom) */}
      {finalMatch && finalMatch.status === 'completed' && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-10 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Final Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-5 rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">
                    {finalWinner ? (
                      <>
                        Champion: <span className="font-semibold text-gray-900">{finalWinner}</span>
                      </>
                    ) : (
                      <>Championship Match</>
                    )}
                  </div>
                  <div className="text-gray-900 font-semibold">
                    {finalMatch.teamA_name || 'Team A'} <span className="text-gray-500 font-medium">vs</span> {finalMatch.teamB_name || 'Team B'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {finalMatch.date ? new Date(finalMatch.date).toLocaleDateString() : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                    {(finalMatch as any).score_teama || 0} - {(finalMatch as any).score_teamb || 0}
                  </div>
                  <Badge className="mt-2 bg-green-100 text-green-700 border-green-200" variant="outline">
                    completed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standings */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-6 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Table className="h-5 w-5" />
              Standings
            </CardTitle>
            {isAdmin && tournamentMatches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateStandings}
                disabled={recalculatingStandings}
              >
                {recalculatingStandings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recalculating...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Recalculate
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        {standings.length > 0 ? (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-gray-600 font-semibold">Pos</th>
                    <th className="text-left py-2 px-4 text-gray-600 font-semibold">Team</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">MP</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">W</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">D</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">L</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">GF</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">GA</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">GD</th>
                    <th className="text-center py-2 px-4 text-gray-600 font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing, index) => (
                    <tr key={standing.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-900 font-bold">{index + 1}</td>
                      <td className="py-2 px-4 text-gray-900">
                        {standing.team?.name || 'Unknown'}
                      </td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.matches_played}</td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.wins}</td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.draws}</td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.losses}</td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.goals_for}</td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.goals_against}</td>
                      <td className="py-2 px-4 text-center text-gray-700">{standing.goal_difference}</td>
                      <td className="py-2 px-4 text-center text-gray-900 font-bold">{standing.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-8">
              <Table className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No standings available yet</p>
              <p className="text-sm text-gray-500">
                {tournamentMatches.some(m => m.status === 'completed')
                  ? 'Complete some matches and click "Recalculate" to update standings.'
                  : 'Complete matches to see standings.'}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Player Statistics */}
      {tournamentMatches.some(m => m.status === 'completed') && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-6 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Player Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats.length > 0 ? (
              <>
                {/* Tab Navigation */}
                <div className="mb-6 border-b border-gray-200">
                  <nav className="flex space-x-1 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                    {[
                      { id: 'top_scorers', label: 'Top Scorers', icon: Zap },
                      { id: 'assists', label: 'Assists', icon: Play },
                      { id: 'mvp', label: 'MVP', icon: Award },
                      { id: 'most_saves', label: 'Most Saves', icon: Save },
                      { id: 'top_performers', label: 'Top Performers', icon: TrendingUp },
                      { id: 'ratings', label: 'Best Ratings', icon: Star },
                    ].map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPlayerStatsTab(tab.id as any)}
                          className={`
                            flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                            ${playerStatsTab === tab.id
                              ? 'border-blue-600 text-blue-600 bg-blue-50'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      )
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div>
                  {/* Top Scorers Tab */}
                  {playerStatsTab === 'top_scorers' && (
                    <div className="space-y-2">
                      {playerStats.slice(0, 5).map((player, index) => (
                        <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{player.player_name}</div>
                              <div className="text-xs text-gray-500">{player.matches_played} matches</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{player.goals}</div>
                            <div className="text-xs text-gray-500">goals</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assists Tab */}
                  {playerStatsTab === 'assists' && (
                    <div className="space-y-2">
                      {[...playerStats].sort((a, b) => b.assists - a.assists).slice(0, 5).map((player, index) => (
                        <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{player.player_name}</div>
                              <div className="text-xs text-gray-500">{player.matches_played} matches</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{player.assists}</div>
                            <div className="text-xs text-gray-500">assists</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MVP Tab (Goals + Assists) */}
                  {playerStatsTab === 'mvp' && (
                    <div className="space-y-2">
                      {calculatePlayerStatsWithScores()
                        .sort((a, b) => (b.goal_contributions || 0) - (a.goal_contributions || 0))
                        .slice(0, 5)
                        .map((player, index) => (
                          <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{player.player_name}</div>
                                <div className="text-xs text-gray-500">{player.matches_played} matches</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{player.goal_contributions || 0}</div>
                              <div className="text-xs text-gray-500">G+A</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Most Saves Tab */}
                  {playerStatsTab === 'most_saves' && (
                    <>
                      {playerStats.some(p => (p.saves || 0) > 0) ? (
                        <div className="space-y-2">
                          {[...playerStats]
                            .filter(p => (p.saves || 0) > 0)
                            .sort((a, b) => (b.saves || 0) - (a.saves || 0))
                            .slice(0, 5)
                            .map((player, index) => (
                              <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{player.player_name}</div>
                                    <div className="text-xs text-gray-500">{player.matches_played} matches</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-gray-900">{player.saves || 0}</div>
                                  <div className="text-xs text-gray-500">saves</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Save className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">No saves recorded yet</p>
                          <p className="text-sm text-gray-500">
                            Player saves will appear here once matches are completed and saves are recorded.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Top Performers Tab (Unified Scoring) */}
                  {playerStatsTab === 'top_performers' && (
                    <div className="space-y-2">
                      {calculatePlayerStatsWithScores()
                        .filter(p => (p.unified_score || 0) > 0)
                        .sort((a, b) => (b.unified_score || 0) - (a.unified_score || 0))
                        .slice(0, 5)
                        .map((player, index) => {
                          const parts = []
                          if (player.goals > 0) parts.push(`${player.goals}G`)
                          if (player.assists > 0) parts.push(`${player.assists}A`)
                          if (player.saves > 0) parts.push(`${player.saves}Sv`)
                          if (player.clean_sheets > 0) parts.push(`${player.clean_sheets}CS`)
                          const breakdown = parts.length > 0 ? parts.join(' ') : '0 pts'

                          return (
                            <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                }`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{player.player_name}</div>
                                  <div className="text-xs text-gray-500">{player.matches_played} matches</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-900">{player.unified_score || 0}</div>
                                <div className="text-xs text-gray-500">{breakdown}</div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}

                  {/* Best Ratings Tab */}
                  {playerStatsTab === 'ratings' && (
                    <>
                      {playerStats.some(p => p.average_rating > 0) ? (
                        <div className="space-y-2">
                          {[...playerStats].filter(p => p.average_rating > 0).sort((a, b) => b.average_rating - a.average_rating).slice(0, 5).map((player, index) => (
                            <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-700 font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{player.player_name}</div>
                                  <div className="text-xs text-gray-500">{player.matches_played} matches</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-900">{player.average_rating.toFixed(1)}</div>
                                <div className="text-xs text-gray-500">avg rating</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">No ratings available yet</p>
                          <p className="text-sm text-gray-500">
                            Player ratings will appear here once matches are completed and players are rated.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No player statistics available yet</p>
                <p className="text-sm text-gray-500">
                  Player statistics will appear here once matches are completed and players are assigned to matches.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tournament Info */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-6 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Tournament Info
            </CardTitle>
            {isAdmin && tournamentMatches.some(m => m.status === 'completed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculatePrizes}
              >
                <Award className="h-4 w-4 mr-2" />
                Calculate Awards
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {prizes.length > 0 ? (
            <div className="space-y-4">
              {/* Team Prizes */}
              {prizes.filter(p => p.category === 'team_rank').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Prizes</h3>
                  <div className="space-y-2">
                    {prizes
                      .filter(p => p.category === 'team_rank')
                      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                      .map((prize) => (
                        <div key={prize.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              prize.rank === 1 ? 'bg-yellow-500' : prize.rank === 2 ? 'bg-gray-400' : 'bg-orange-600'
                            }`}>
                              {prize.rank}
                            </div>
                            <div>
                              {/* Common pattern: primary text = team, award as a badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">
                                  {prize.recipient_team?.name || 'Unknown Team'}
                                </span>
                                <Badge
                                  className={
                                    prize.rank === 1
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : prize.rank === 2
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-orange-100 text-orange-800'
                                  }
                                >
                                  {prize.prize_description || 'Team Award'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {prize.prize_amount && (
                            <div className="text-right">
                              <div className="font-bold text-gray-900">${prize.prize_amount}</div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Individual Prizes */}
              {prizes.filter(p => p.category !== 'team_rank').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Individual Awards</h3>
                  <div className="space-y-2">
                    {prizes
                      .filter(p => p.category !== 'team_rank')
                      .map((prize) => (
                        <div key={prize.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 text-purple-700">
                              <Award className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              {(() => {
                                const { title, meta } = splitAwardDescription(prize.prize_description)
                                const isManualSelection = prize.prize_description?.includes('Manual Selection')
                                return (
                                  <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900">
                                        {prize.recipient_player?.user_profile?.name || 'Unknown Player'}
                                      </span>
                                      <Badge className="bg-purple-100 text-purple-700">
                                        {title}
                                      </Badge>
                                      {isManualSelection && (
                                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                                          Manual
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {meta}
                                      {prize.recipient_team?.name && ` • ${prize.recipient_team.name}`}
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {prize.category === 'player_of_tournament' && isAdmin && playerStats.length > 0 && (
                              <select
                                value={prize.recipient_player_id || ''}
                                onChange={(e) => {
                                  const selectedPlayer = playerStats.find(p => p.player_id === e.target.value)
                                  if (selectedPlayer) {
                                    handleSetPlayerOfTournament(selectedPlayer.player_id, selectedPlayer.team_id)
                                  }
                                }}
                                className="text-sm px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select player...</option>
                                {playerStats.map((player) => (
                                  <option key={player.player_id} value={player.player_id}>
                                    {player.player_name || 'Unknown Player'}
                                  </option>
                                ))}
                              </select>
                            )}
                            {prize.prize_amount && (
                              <div className="text-right">
                                <div className="font-bold text-gray-900">${prize.prize_amount}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {/* Manual Player of Tournament selection if no award exists yet */}
                    {isAdmin && playerStats.length > 0 && !prizes.some(p => p.category === 'player_of_tournament') && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 text-purple-700">
                            <Award className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Player of the Tournament</div>
                            <div className="text-xs text-gray-500">Select manually</div>
                          </div>
                        </div>
                        <select
                          value=""
                          onChange={(e) => {
                            const selectedPlayer = playerStats.find(p => p.player_id === e.target.value)
                            if (selectedPlayer) {
                              handleSetPlayerOfTournament(selectedPlayer.player_id, selectedPlayer.team_id)
                            }
                          }}
                          className="text-sm px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select player...</option>
                          {playerStats.map((player) => (
                            <option key={player.player_id} value={player.player_id}>
                              {player.player_name || 'Unknown Player'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No awards calculated yet</p>
              <p className="text-sm text-gray-500">
                {tournamentMatches.some(m => m.status === 'completed')
                  ? isAdmin
                    ? 'Click "Calculate Awards" to generate tournament awards from completed matches.'
                    : 'Awards will be calculated after tournament completion.'
                  : 'Complete matches to enable awards calculation.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Fixtures Confirmation Modal */}
      {showGenerateFixturesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white border-gray-200 max-w-md w-full shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900">Generate Fixtures</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                Generate fixtures for all registered teams? This will create matches for the tournament.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateFixturesModal(false)}
                  disabled={generatingFixtures}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmGenerateFixtures}
                  disabled={generatingFixtures}
                >
                  {generatingFixtures ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Tournament Modal */}
      {showDeleteModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white border-gray-200 max-w-md w-full shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900">Delete Tournament</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-gray-600">
                <p className="mb-2">Are you sure you want to delete this tournament?</p>
                <p className="font-semibold text-gray-900 mb-2">{tournament.name}</p>
                <p className="text-sm text-red-600 mb-4">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-4">
                  <li>All tournament matches</li>
                  <li>All match statistics and player stats</li>
                  <li>Tournament standings and prizes</li>
                  <li>Team registrations for this tournament</li>
                </ul>
                <p className="text-sm font-semibold text-gray-900">
                  Note: Persistent teams will remain and can be used in other tournaments.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleDeleteTournament}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Tournament
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Tournament Modal */}
      {showEditModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900">Edit Tournament</CardTitle>
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
                <Label htmlFor="edit_name" className="text-gray-900">Tournament Name *</Label>
                <Input
                  id="edit_name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_description" className="text-gray-900">Description</Label>
                <textarea
                  id="edit_description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit_type" className="text-gray-900">Tournament Type *</Label>
                <select
                  id="edit_type"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="double_round_robin">Double Round Robin (All teams play each other twice, then final)</option>
                  <option value="knockout">Knockout</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_start_date" className="text-gray-900">Start Date</Label>
                  <Input
                    id="edit_start_date"
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_end_date" className="text-gray-900">End Date</Label>
                  <Input
                    id="edit_end_date"
                    type="date"
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_max_teams" className="text-gray-900">Max Teams (Optional)</Label>
                <Input
                  id="edit_max_teams"
                  type="number"
                  value={editFormData.max_teams}
                  onChange={(e) => setEditFormData({ ...editFormData, max_teams: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  min="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_min_players" className="text-gray-900">Min Players/Team</Label>
                  <Input
                    id="edit_min_players"
                    type="number"
                    value={editFormData.min_players_per_team}
                    onChange={(e) => setEditFormData({ ...editFormData, min_players_per_team: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_max_players" className="text-gray-900">Max Players/Team</Label>
                  <Input
                    id="edit_max_players"
                    type="number"
                    value={editFormData.max_players_per_team}
                    onChange={(e) => setEditFormData({ ...editFormData, max_players_per_team: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_points_win" className="text-gray-900">Points per Win</Label>
                  <Input
                    id="edit_points_win"
                    type="number"
                    value={editFormData.points_per_win}
                    onChange={(e) => setEditFormData({ ...editFormData, points_per_win: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_points_draw" className="text-gray-900">Points per Draw</Label>
                  <Input
                    id="edit_points_draw"
                    type="number"
                    value={editFormData.points_per_draw}
                    onChange={(e) => setEditFormData({ ...editFormData, points_per_draw: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_points_loss" className="text-gray-900">Points per Loss</Label>
                  <Input
                    id="edit_points_loss"
                    type="number"
                    value={editFormData.points_per_loss}
                    onChange={(e) => setEditFormData({ ...editFormData, points_per_loss: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleUpdateTournament}
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
    </div>
  )
}
