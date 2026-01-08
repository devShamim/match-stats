'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PlayerAvatar from '@/components/PlayerAvatar'
import { ArrowLeft, Trophy, Target, Award, Users, Calendar, TrendingUp, Clock, Crown, Shield, Save, Star, ChevronLeft, ChevronRight } from 'lucide-react'

interface PlayerStats {
  total_goals: number
  total_assists: number
  total_own_goals: number
  total_yellow_cards: number
  total_red_cards: number
  total_clean_sheets: number
  total_saves: number
  total_minutes: number
  average_rating: number
  matches_played: number
  recent_matches: Array<{
    match_id: string
    date: string
    opponent: string
    teamA_name: string
    teamB_name: string
    goals: number
    assists: number
    own_goals: number
    yellow_cards: number
    red_cards: number
    clean_sheets: number
    saves: number
    minutes_played: number
    rating: number | null
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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (playerId) {
      setCurrentPage(1) // Reset to first page when player changes
      fetchPlayerData()
    }
  }, [playerId])

  const fetchPlayerData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch player info and stats in parallel
      const [playerResponse, statsResponse] = await Promise.all([
        fetch(`/api/players/${playerId}?t=${Date.now()}`),
        fetch(`/api/player-stats?playerId=${playerId}&t=${Date.now()}`)
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
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Player Statistics</h2>
            <p className="text-gray-600">Comprehensive performance metrics</p>
          </div>

          {/* Primary Stats Row - 4 columns: Matches, Goals, Assists, Own Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Matches Played Card */}
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-500/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">Matches</p>
                    <p className="text-xs text-green-600 font-medium">Played</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.matches_played}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{width: `${Math.min((stats.matches_played / 20) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{stats.total_minutes} total minutes</p>
                </div>
              </CardContent>
            </Card>

            {/* Goals Card */}
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">Goals</p>
                    <p className="text-xs text-yellow-600 font-medium">Scored</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total_goals}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full" style={{width: `${Math.min((stats.total_goals / Math.max(stats.matches_played, 1)) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{stats.matches_played > 0 ? (stats.total_goals / stats.matches_played).toFixed(1) : 0} per match</p>
                </div>
              </CardContent>
            </Card>

            {/* Assists Card */}
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-500/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">Assists</p>
                    <p className="text-xs text-blue-600 font-medium">Key Passes</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total_assists}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{width: `${Math.min((stats.total_assists / Math.max(stats.matches_played, 1)) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{stats.matches_played > 0 ? (stats.total_assists / stats.matches_played).toFixed(1) : 0} per match</p>
                </div>
              </CardContent>
            </Card>

            {/* Own Goals Card */}
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-gradient-to-br from-orange-50 to-red-50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-500/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Target className="h-6 w-6 text-white rotate-180" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">Own Goals</p>
                    <p className="text-xs text-orange-600 font-medium">Against</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total_own_goals ?? 0}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{width: `${Math.min(((stats.total_own_goals ?? 0) / Math.max(stats.matches_played, 1)) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{stats.matches_played > 0 ? ((stats.total_own_goals ?? 0) / stats.matches_played).toFixed(1) : 0} per match</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats Row - 3 columns: Saves, Clean Sheets, Minutes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Saves Card */}
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-500/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Save className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">Saves</p>
                    <p className="text-xs text-purple-600 font-medium">Shot Stops</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total_saves}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: `${Math.min((stats.total_saves / Math.max(stats.matches_played, 1)) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{stats.matches_played > 0 ? (stats.total_saves / stats.matches_played).toFixed(1) : 0} per match</p>
                </div>
              </CardContent>
            </Card>

            {/* Clean Sheets Card */}
            <Card className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-500/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">Clean Sheets</p>
                    <p className="text-xs text-blue-600 font-medium">Shutouts</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total_clean_sheets}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full" style={{width: `${Math.min((stats.total_clean_sheets / Math.max(stats.matches_played, 1)) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{stats.matches_played > 0 ? ((stats.total_clean_sheets / stats.matches_played) * 100).toFixed(1) : 0}% clean sheet rate</p>
                </div>
              </CardContent>
            </Card>

            {/* Average Rating Card */}
            {(() => {
              const rating = stats.average_rating || 0
              const isGreen = rating >= 7
              const isYellow = rating >= 5 && rating < 7
              const isRed = rating < 5

              const cardBg = isGreen
                ? 'bg-gradient-to-br from-green-50 to-emerald-50'
                : isYellow
                ? 'bg-gradient-to-br from-yellow-50 to-amber-50'
                : 'bg-gradient-to-br from-red-50 to-rose-50'

              const overlayBg = isGreen
                ? 'bg-gradient-to-br from-green-400/10 to-emerald-500/10'
                : isYellow
                ? 'bg-gradient-to-br from-yellow-400/10 to-amber-500/10'
                : 'bg-gradient-to-br from-red-400/10 to-rose-500/10'

              const starBg = isGreen
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : isYellow
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                : 'bg-gradient-to-r from-red-500 to-rose-500'

              const performanceText = isGreen
                ? 'text-green-600'
                : isYellow
                ? 'text-yellow-600'
                : 'text-red-600'

              const progressBar = isGreen
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : isYellow
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                : 'bg-gradient-to-r from-red-500 to-rose-500'

              return (
                <Card className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-xl ${cardBg} backdrop-blur-sm overflow-hidden`}>
                  <div className={`absolute inset-0 ${overlayBg}`}></div>
                  <CardContent className="relative p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 ${starBg} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-medium text-gray-800">Average Rating</p>
                        <p className={`text-xs ${performanceText} font-medium`}>Performance</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gray-900 mb-2">
                        {stats.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${progressBar} h-2 rounded-full`} style={{width: `${Math.min((stats.average_rating || 0) * 10, 100)}%`}}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Out of 10.0</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        </div>

        {/* Recent Matches */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              Recent Matches
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, stats.recent_matches.length)} of {stats.recent_matches.length} matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recent_matches.length > 0 ? (
              <>
                <div className="space-y-3 sm:space-y-4">
                  {stats.recent_matches
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((match, index) => {
                  const winner = getMatchWinner(match)
                  return (
                    <div key={index} className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-emerald-50 transition-all duration-300 border border-gray-200 hover:border-green-200">
                      {/* Date and Teams - Mobile: Stacked, Desktop: Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                        {/* Teams */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <p className="font-semibold text-gray-900 text-xs sm:text-base">{match.teamA_name || 'Team A'}</p>
                            {winner === 'teamA' && (
                              <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-gray-400 text-xs sm:text-sm">vs</span>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <p className="font-semibold text-gray-900 text-xs sm:text-base">{match.teamB_name || 'Team B'}</p>
                            {winner === 'teamB' && (
                              <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        {/* Date */}
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-600">{formatDate(match.date)}</p>
                        </div>
                      </div>

                      {/* Statistics - Mobile: Wrapped Grid, Desktop: Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:gap-4">
                          {match.goals > 0 && (
                            <div className="flex items-center text-yellow-600">
                              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.goals} goal{match.goals !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {match.assists > 0 && (
                            <div className="flex items-center text-blue-600">
                              <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.assists} assist{match.assists !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {/* Rating - moved here beside goals and assists */}
                          {match.rating !== null && (
                            <div className={`flex items-center ${
                              match.rating >= 7
                                ? 'text-green-600'
                                : match.rating >= 5
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.rating.toFixed(1)}/10</span>
                            </div>
                          )}
                          {(match.own_goals || 0) > 0 && (
                            <div className="flex items-center text-orange-600">
                              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rotate-180 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.own_goals} own goal{(match.own_goals || 0) !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {match.yellow_cards > 0 && (
                            <div className="flex items-center text-yellow-600">
                              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.yellow_cards} yellow</span>
                            </div>
                          )}
                          {match.red_cards > 0 && (
                            <div className="flex items-center text-red-600">
                              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.red_cards} red</span>
                            </div>
                          )}
                          {match.clean_sheets > 0 && (
                            <div className="flex items-center text-blue-600">
                              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">Clean sheet</span>
                            </div>
                          )}
                          {match.saves > 0 && (
                            <div className="flex items-center text-purple-600">
                              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm">{match.saves} save{match.saves !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/matches/${match.match_id}`}
                          className="inline-flex items-center text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto sm:ml-auto"
                        >
                          View Match Details
                          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 ml-1 rotate-180" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
                </div>

                {/* Pagination Controls */}
                {stats.recent_matches.length > itemsPerPage && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(stats.recent_matches.length / itemsPerPage) }, (_, i) => i + 1)
                          .filter(page => {
                            const totalPages = Math.ceil(stats.recent_matches.length / itemsPerPage)
                            // Show first page, last page, current page, and pages around current
                            return page === 1 ||
                                   page === totalPages ||
                                   (page >= currentPage - 1 && page <= currentPage + 1)
                          })
                          .map((page, idx, arr) => {
                            // Add ellipsis if there's a gap
                            const prevPage = arr[idx - 1]
                            const showEllipsis = prevPage && page - prevPage > 1

                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsis && (
                                  <span className="px-2 text-gray-500">...</span>
                                )}
                                <Button
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="min-w-[2.5rem]"
                                >
                                  {page}
                                </Button>
                              </div>
                            )
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(stats.recent_matches.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(stats.recent_matches.length / itemsPerPage)}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Page {currentPage} of {Math.ceil(stats.recent_matches.length / itemsPerPage)}
                    </p>
                  </div>
                )}
              </>
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