'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Target, Award, Users, Calendar, TrendingUp, Eye, Crown } from 'lucide-react'
import Link from 'next/link'
import MatchDetailsView from '@/components/MatchDetailsView'

interface PlayerStats {
  player_id: string
  player_name: string
  player_photo?: string
  total_goals: number
  total_assists: number
  total_yellow_cards: number
  total_red_cards: number
  total_minutes: number
  matches_played: number
}

interface StatsData {
  overview: {
    total_goals: number
    total_assists: number
    total_matches: number
    total_players: number
  }
  leaderboards: {
    top_scorers: PlayerStats[]
    top_assists: PlayerStats[]
    top_performers: PlayerStats[]
    most_active: PlayerStats[]
    most_cards: PlayerStats[]
  }
  recent_matches: any[]
}

export default function PublicStatsView() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  useEffect(() => {
    fetchPublicStats()
  }, [])

  const fetchPublicStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stats-page?t=${Date.now()}`, {
        cache: 'no-store',
        next: { revalidate: 0 }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      } else {
        throw new Error(data.error || 'Failed to fetch stats')
      }
    } catch (err: any) {
      console.error('Error fetching public stats:', err)
      setError(err.message || 'Failed to load statistics')
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMatchWinner = (match: any) => {
    const scoreA = match.score_teama || 0
    const scoreB = match.score_teamb || 0

    if (scoreA > scoreB) return 'teamA'
    if (scoreB > scoreA) return 'teamB'
    return 'draw'
  }

  const handleViewDetails = (match: any) => {
    setSelectedMatch(match)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetailsModal = () => {
    setSelectedMatch(null)
    setIsDetailsModalOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading statistics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <TrendingUp className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Statistics</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPublicStats}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Statistics Available</h2>
            <p className="text-gray-600">No match data found to display statistics.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center py-16 mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-green-600 rounded-full mb-6 shadow-lg">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent mb-6">
            SovWare Football Statistics
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The team's performance tracked with real-time statistics, player rankings, and match insights
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/matches">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                <Calendar className="h-5 w-5 mr-2" />
                View All Matches
              </Button>
            </Link>
            <Link href="/leaderboards">
              <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 px-8 py-3 rounded-full transition-all duration-300">
                <Trophy className="h-5 w-5 mr-2" />
                Full Leaderboards
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Players</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.total_players}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">Active Squad</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Matches</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.total_matches}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Games Played</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Goals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.total_goals}</p>
                  <p className="text-xs text-yellow-600 font-medium mt-1">Goals Scored</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Assists</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.overview.total_assists}</p>
                  <p className="text-xs text-purple-600 font-medium mt-1">Key Passes</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboards */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Player Rankings</h2>
            <p className="text-gray-600">Top performers across different categories</p>
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Scorers */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg mr-3">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                Top Scorers
              </CardTitle>
                <CardDescription className="text-sm">Players with the most goals</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.leaderboards.top_scorers.length > 0 ? (
              <div className="space-y-3">
                  {stats.leaderboards.top_scorers.map((player, index) => (
                    <div key={player.player_id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors duration-200 rounded-lg">
                      <div className="flex items-center">
                        {index < 5 ? (
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs mr-3 shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-500 text-yellow-800 border-2 border-yellow-400 ring-2 ring-yellow-200' :
                            index === 1 ? 'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500 text-gray-800 border-2 border-gray-400 ring-2 ring-gray-200' :
                            index === 2 ? 'bg-gradient-to-br from-orange-200 via-orange-300 to-orange-500 text-orange-800 border-2 border-orange-400 ring-2 ring-orange-200' :
                            'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-300 text-gray-600 border-2 border-gray-200 ring-2 ring-gray-50'
                      }`}>
                        {index + 1}
                      </div>
                        ) : (
                          <span className="text-sm font-medium text-gray-500 mr-3 w-6 text-center">
                            {index + 1}.
                          </span>
                        )}
                      <div>
                          <Link href={`/player/${player.player_id}`} className="hover:text-blue-600 transition-colors">
                            <p className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">{player.player_name}</p>
                        </Link>
                          <p className="text-xs text-gray-500">{player.matches_played} matches</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{player.total_goals}</p>
                        <p className="text-xs text-gray-500">goals</p>
                      </div>
                    </div>
                  ))}
                    </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No goal scorers yet</p>
              </div>
              )}
            </CardContent>
          </Card>

            {/* Top Assists */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mr-3">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  Top Assists
              </CardTitle>
                <CardDescription className="text-sm">Players with the most assists</CardDescription>
            </CardHeader>
            <CardContent>
                {stats.leaderboards.top_assists.length > 0 ? (
              <div className="space-y-3">
                    {stats.leaderboards.top_assists.map((player, index) => (
                      <div key={player.player_id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors duration-200 rounded-lg">
                        <div className="flex items-center">
                          {index < 5 ? (
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs mr-3 shadow-lg ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-500 text-yellow-800 border-2 border-yellow-400 ring-2 ring-yellow-200' :
                              index === 1 ? 'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500 text-gray-800 border-2 border-gray-400 ring-2 ring-gray-200' :
                              index === 2 ? 'bg-gradient-to-br from-orange-200 via-orange-300 to-orange-500 text-orange-800 border-2 border-orange-400 ring-2 ring-orange-200' :
                              'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-300 text-gray-600 border-2 border-gray-200 ring-2 ring-gray-50'
                      }`}>
                        {index + 1}
                      </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-500 mr-3 w-6 text-center">
                              {index + 1}.
                            </span>
                          )}
                          <div>
                            <Link href={`/player/${player.player_id}`} className="hover:text-blue-600 transition-colors">
                              <p className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">{player.player_name}</p>
                            </Link>
                            <p className="text-xs text-gray-500">{player.matches_played} matches</p>
                          </div>
                        </div>
                    <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{player.total_assists}</p>
                      <p className="text-xs text-gray-500">assists</p>
                    </div>
                  </div>
                ))}
              </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No assists recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-3">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Top Performers
                </CardTitle>
                <CardDescription className="text-sm">Goals + assists combined</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.leaderboards.top_performers.length > 0 ? (
                  <div className="space-y-3">
                    {stats.leaderboards.top_performers.map((player, index) => (
                      <div key={player.player_id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors duration-200 rounded-lg">
                        <div className="flex items-center">
                          {index < 5 ? (
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs mr-3 shadow-lg ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-500 text-yellow-800 border-2 border-yellow-400 ring-2 ring-yellow-200' :
                              index === 1 ? 'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500 text-gray-800 border-2 border-gray-400 ring-2 ring-gray-200' :
                              index === 2 ? 'bg-gradient-to-br from-orange-200 via-orange-300 to-orange-500 text-orange-800 border-2 border-orange-400 ring-2 ring-orange-200' :
                              'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-300 text-gray-600 border-2 border-gray-200 ring-2 ring-gray-50'
                            }`}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-500 mr-3 w-6 text-center">
                              {index + 1}.
                            </span>
                          )}
                          <div>
                            <Link href={`/player/${player.player_id}`} className="hover:text-blue-600 transition-colors">
                              <p className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">{player.player_name}</p>
                            </Link>
                            <p className="text-xs text-gray-500">{player.matches_played} matches</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{player.total_goals + player.total_assists}</p>
                          <p className="text-xs text-gray-500">{player.total_goals}G {player.total_assists}A</p>
                        </div>
                      </div>
                    ))}
              </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No performers yet</p>
                  </div>
                )}
            </CardContent>
          </Card>
          </div>
        </div>

          {/* Recent Matches */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Matches</h2>
            <p className="text-gray-600">Latest match results and highlights</p>
          </div>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Match Results</CardTitle>
                    <CardDescription className="text-sm">Latest match results</CardDescription>
                  </div>
                </div>
                <Link href="/matches">
                  <Button variant="outline" size="sm" className="flex items-center gap-2 border-2 border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-600 transition-all duration-300">
                    <Eye className="h-4 w-4" />
                    View All Matches
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
            {stats.recent_matches.length > 0 ? (
              <div className="space-y-4">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 rounded-lg font-medium text-gray-700 text-sm">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Team A</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-3">Team B</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>

                {/* Match Rows */}
                {stats.recent_matches.map((match) => {
                  const winner = getMatchWinner(match)
                  return (
                    <div key={match.id} className="grid grid-cols-12 gap-4 items-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-emerald-50 transition-all duration-300 border border-gray-200 hover:border-green-200">
                      {/* Date Column */}
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-700">{formatDate(match.date)}</p>
                        <Badge className={`mt-2 text-xs font-medium ${getStatusColor(match.status)}`}>
                          {match.status}
                        </Badge>
                      </div>

                      {/* Team A Column */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{match.teamA_name || 'Team A'}</p>
                          {winner === 'teamA' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{match.type}</p>
                      </div>

                      {/* Score Column */}
                      <div className="col-span-2 text-center">
                        <div className="text-3xl font-bold text-gray-900">
                          {match.score_teama || 0} - {match.score_teamb || 0}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Final Score</p>
                      </div>

                      {/* Team B Column */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{match.teamB_name || 'Team B'}</p>
                          {winner === 'teamB' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                    </div>
                        <p className="text-sm text-gray-600 font-medium">
                          {match.opponent || 'Internal Match'}
                        </p>
                      </div>

                      {/* Actions Column */}
                      <div className="col-span-2 text-center">
                        <Button
                          onClick={() => handleViewDetails(match)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 border-2 border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-600 transition-all duration-300"
                        >
                          <Eye className="h-4 w-4" />
                          See Details
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent matches found</p>
            )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            © 2025 SovWare Football Statistics. Made with ❤️ by{' '}
            <span className="font-semibold text-gray-700">Shamim Ahmed</span>
          </p>
        </div>

        {/* Match Details Modal */}
        <MatchDetailsView
          match={selectedMatch}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
        />
      </div>
    </div>
  )
}
