'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PlayerAvatar from '@/components/PlayerAvatar'
import { ArrowLeft, Trophy, Target, Award, Users, Calendar, TrendingUp, Clock, Crown } from 'lucide-react'

interface PlayerStats {
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes: number
  matches_played: number
  recent_matches: Array<{
    match_id: string
    date: string
    opponent: string
    teamA_name: string
    teamB_name: string
    goals: number
    assists: number
    yellow_cards: number
    red_cards: number
    minutes_played: number
  }>
}

interface Player {
    id: string
  user_profile?: {
    name: string
    position?: string
    status?: string
    photo_url?: string
  }
  jersey_number?: string
  preferred_position?: string
}

export default function PlayerStatsPage() {
  const params = useParams()
  const router = useRouter()
  const playerId = params.id as string

  const [player, setPlayer] = useState<Player | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (playerId) {
      fetchPlayerData()
    }
  }, [playerId])

  const fetchPlayerData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch player info and stats in parallel
      const [playerResponse, statsResponse] = await Promise.all([
        fetch(`/api/players/${playerId}?t=${Date.now()}`, {
          cache: 'no-store',
          next: { revalidate: 0 }
        }),
        fetch(`/api/player-stats?playerId=${playerId}&t=${Date.now()}`, {
          cache: 'no-store',
          next: { revalidate: 0 }
        })
      ])

      if (!playerResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch player data')
      }

      const playerData = await playerResponse.json()
      const statsData = await statsResponse.json()

      if (playerData.success) {
        setPlayer(playerData.player)
      }

      if (statsData.success) {
        setStats(statsData.stats)
      } else {
        throw new Error(statsData.error || 'Failed to fetch player stats')
      }
    } catch (err: any) {
      console.error('Error fetching player data:', err)
      setError(err.message || 'Failed to load player data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMatchWinner = (match: any) => {
    const scoreA = match.score_teama || 0
    const scoreB = match.score_teamb || 0

    if (scoreA > scoreB) return 'teamA'
    if (scoreB > scoreA) return 'teamB'
    return 'draw'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading player statistics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <TrendingUp className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Player Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchPlayerData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!player || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Player Not Found</h2>
            <p className="text-gray-600">The requested player could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-6 flex items-center gap-2 border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <PlayerAvatar
                imageUrl={player.user_profile?.photo_url}
                name={player.user_profile?.name}
                size="xl"
                className="shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent mb-4">
              {player.user_profile?.name || 'Unknown Player'}
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Player Statistics & Performance Overview
            </p>
          </div>
        </div>

        {/* Player Info Card */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-3">
                <Users className="h-5 w-5 text-white" />
              </div>
              Player Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-2">Position</p>
                <p className="text-lg font-semibold text-gray-900">{player.user_profile?.position || 'Not specified'}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-2">Jersey Number</p>
                <p className="text-lg font-semibold text-gray-900">{player.jersey_number || 'Not assigned'}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-2">Preferred Position</p>
                <p className="text-lg font-semibold text-gray-900">{player.preferred_position || 'Not specified'}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm font-medium text-gray-600 mb-2">Status</p>
                <Badge className={`mt-1 ${player.user_profile?.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {player.user_profile?.status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Goals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_goals}</p>
                  <p className="text-xs text-yellow-600 font-medium mt-1">Goals Scored</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Assists</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_assists}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Key Passes</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Matches Played</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.matches_played}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">Games Played</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Minutes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_minutes}</p>
                  <p className="text-xs text-purple-600 font-medium mt-1">Minutes Played</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Matches */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              Recent Matches
            </CardTitle>
            <CardDescription className="text-sm">Last 5 matches performance</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recent_matches.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_matches.map((match, index) => {
                  const winner = getMatchWinner(match)
                  return (
                    <div key={index} className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-emerald-50 transition-all duration-300 border border-gray-200 hover:border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{match.teamA_name || 'Team A'}</p>
                            {winner === 'teamA' && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-gray-400">vs</span>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{match.teamB_name || 'Team B'}</p>
                            {winner === 'teamB' && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-600">{formatDate(match.date)}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          {match.goals > 0 && (
                            <div className="flex items-center text-yellow-600">
                              <Trophy className="h-4 w-4 mr-2" />
                              <span className="font-medium">{match.goals} goal{match.goals !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {match.assists > 0 && (
                            <div className="flex items-center text-blue-600">
                              <Award className="h-4 w-4 mr-2" />
                              <span className="font-medium">{match.assists} assist{match.assists !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {match.yellow_cards > 0 && (
                            <div className="flex items-center text-yellow-600">
                              <Target className="h-4 w-4 mr-2" />
                              <span className="font-medium">{match.yellow_cards} yellow</span>
                            </div>
                          )}
                          {match.red_cards > 0 && (
                            <div className="flex items-center text-red-600">
                              <Target className="h-4 w-4 mr-2" />
                              <span className="font-medium">{match.red_cards} red</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-medium">{match.minutes_played} min</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No recent matches found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disciplinary Record */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg mr-3">
                <Target className="h-5 w-5 text-white" />
              </div>
              Disciplinary Record
            </CardTitle>
            <CardDescription className="text-sm">Cards received during matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-yellow-800">{stats.total_yellow_cards}</p>
                <p className="text-sm font-medium text-yellow-600 mt-2">Yellow Cards</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-red-400 to-pink-400 rounded-full">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-800">{stats.total_red_cards}</p>
                <p className="text-sm font-medium text-red-600 mt-2">Red Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}