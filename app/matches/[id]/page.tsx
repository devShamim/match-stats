'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/context/UserContext'
import { Match } from '@/types'
import {
  ArrowLeft, Clock, Trophy, Users, Target, Zap, AlertTriangle,
  UserCheck, UserX, Shield, Calendar, MapPin, Star,
  TrendingUp, Activity, Award, Timer, Edit, Loader2
} from 'lucide-react'
import Link from 'next/link'

interface Goal {
  id?: string
  minute: number
  scorer: string
  assist?: string
  team: 'A' | 'B'
}

interface CardEvent {
  id?: string
  minute: number
  player: string
  type: 'yellow' | 'red'
  team: 'A' | 'B'
}

interface Substitution {
  id?: string
  minute: number
  playerOut: string
  playerIn: string
  team: 'A' | 'B'
}

interface MatchStats {
  possession_teamA: number
  possession_teamB: number
  shots_teamA: number
  shots_teamB: number
  shots_on_target_teamA: number
  shots_on_target_teamB: number
  fouls_teamA: number
  fouls_teamB: number
}

interface MatchDetails {
  goals: Goal[]
  own_goals?: Array<{
    id?: string
    player_id: string
    player_name: string
    minute: number
    team: 'A' | 'B'
    opponent_team: 'A' | 'B'
  }>
  cards: CardEvent[]
  substitutions: Substitution[]
  stats: MatchStats
  clean_sheet_teamA: boolean
  clean_sheet_teamB: boolean
  match_summary?: string
  teamAName?: string
  teamBName?: string
  teamAPlayers?: string[]
  teamBPlayers?: string[]
}

export default function MatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { isAdmin } = useUser()
  const [match, setMatch] = useState<Match | null>(null)
  const [details, setDetails] = useState<MatchDetails>({
    goals: [],
    cards: [],
    substitutions: [],
    stats: {
      possession_teamA: 50,
      possession_teamB: 50,
      shots_teamA: 0,
      shots_teamB: 0,
      shots_on_target_teamA: 0,
      shots_on_target_teamB: 0,
      fouls_teamA: 0,
      fouls_teamB: 0
    },
    clean_sheet_teamA: false,
    clean_sheet_teamB: false,
    match_summary: '',
    teamAName: 'Team A',
    teamBName: 'Team B',
    teamAPlayers: [],
    teamBPlayers: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadMatchData()
    }
  }, [params.id])

  const loadMatchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch match data and details in one call
      const response = await fetch(`/api/match-details/${params.id}?t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch match')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Match not found')
      }

      // Set match data
      if (data.match) {
        setMatch(data.match as Match)
      } else {
        setError('Match not found')
        setLoading(false)
        return
      }

      // Set match details
      if (data.details) {
        setDetails(prev => ({
          ...prev,
          ...data.details,
          goals: data.details.goals || [],
          own_goals: data.details.own_goals || [],
          cards: data.details.cards || [],
          substitutions: data.details.substitutions || [],
          stats: data.details.stats || prev.stats,
          match_summary: data.details.match_summary || '',
          teamAName: data.details.teamAName || data.match?.teamA_name || 'Team A',
          teamBName: data.details.teamBName || data.match?.teamB_name || 'Team B',
          teamAPlayers: data.details.teamAPlayers || [],
          teamBPlayers: data.details.teamBPlayers || []
        }))
      }
    } catch (error: any) {
      console.error('Error loading match:', error)
      setError(error.message || 'Failed to load match details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'internal' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading match details...</span>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Match not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/matches">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Matches
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-b-3xl">
        <div className="absolute inset-0 bg-black/5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent transform -skew-x-12"></div>
        </div>

        <div className="relative px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/matches')}
              className="text-white hover:bg-white/20 text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Matches</span>
              <span className="sm:hidden">Back</span>
            </Button>
            {isAdmin && (
              <Button
                onClick={() => router.push(`/matches?edit=${match.id}`)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm sm:text-base"
              >
                <Edit className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Edit Match</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            )}
          </div>

          <div className="flex-1">
            <CardTitle className="flex items-center text-xl sm:text-2xl lg:text-3xl text-white mb-3 sm:mb-4">
              <Trophy className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mr-2 sm:mr-3 text-yellow-300" />
              <span className="break-words">{match.type === 'internal' ? 'Internal Match' : match.opponent || 'External Match'}</span>
            </CardTitle>
            <CardDescription className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-sm sm:text-base text-white/90">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(match.date)}
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {formatTime(match.date)}
              </span>
              {match.location && (
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="break-words">{match.location}</span>
                </span>
              )}
            </CardDescription>

            {/* Match Status and Type */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
              <Badge className={`${getStatusColor(match.status)} text-xs sm:text-sm px-2 sm:px-3 py-1`}>
                {match.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={`${getTypeColor(match.type)} text-xs sm:text-sm px-2 sm:px-3 py-1`}>
                {match.type.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Score Display */}
        <Card className="mb-6 border-0 shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 mb-6">
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-2">Final Score</h3>
              </div>
              {/* Desktop: Side by side, Mobile: Compact horizontal layout */}
              <div className="flex items-center justify-center gap-3 sm:gap-6">
                {/* Team A */}
                <div className="text-center flex-1 min-w-0">
                  <div className="text-3xl sm:text-5xl font-bold text-gray-900 mb-1 sm:mb-2">
                    {(match as any).score_teama || 0}
                  </div>
                  <div className="text-xs sm:text-lg font-medium text-gray-600 break-words px-1">{details.teamAName || 'Team A'}</div>
                  {details.clean_sheet_teamA && (
                    <div className="flex items-center justify-center mt-1 sm:mt-2">
                      <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-1" />
                      <span className="text-[10px] sm:text-sm text-green-600 font-medium">Clean Sheet</span>
                    </div>
                  )}
                </div>

                {/* VS Separator */}
                <div className="text-center flex-shrink-0">
                  <div className="text-lg sm:text-2xl font-bold text-gray-500">VS</div>
                </div>

                {/* Team B */}
                <div className="text-center flex-1 min-w-0">
                  <div className="text-3xl sm:text-5xl font-bold text-gray-900 mb-1 sm:mb-2">
                    {(match as any).score_teamb || 0}
                  </div>
                  <div className="text-xs sm:text-lg font-medium text-gray-600 break-words px-1">{details.teamBName || 'Team B'}</div>
                  {details.clean_sheet_teamB && (
                    <div className="flex items-center justify-center mt-1 sm:mt-2">
                      <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-1" />
                      <span className="text-[10px] sm:text-sm text-green-600 font-medium">Clean Sheet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Goal Scorers */}
              {(details.goals.length > 0 || (details.own_goals && details.own_goals.length > 0)) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0">
                    {/* Team A Goals */}
                    <div className="flex-1 sm:pr-4 text-center">
                      {(() => {
                        const teamAGoals = details.goals.filter(goal => goal.team === 'A')
                        const groupedGoals = teamAGoals.reduce((acc, goal) => {
                          if (!acc[goal.scorer]) {
                            acc[goal.scorer] = []
                          }
                          acc[goal.scorer].push(goal.minute)
                          return acc
                        }, {} as Record<string, number[]>)

                        const teamAOwnGoals = details.own_goals?.filter(og => og.team === 'A') || []

                        return (
                          <>
                            {Object.keys(groupedGoals).length > 0 ? (
                              Object.entries(groupedGoals)
                                .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]))
                                .map(([scorer, minutes]) => (
                                  <div key={scorer} className="py-1">
                                    <span className="text-sm text-gray-700">
                                      {scorer} ({minutes.sort((a, b) => a - b).join("', ")}')
                                    </span>
                                  </div>
                                ))
                            ) : (
                              <div className="text-sm text-gray-500 italic">No goals</div>
                            )}
                            {/* Own Goals for Team A (scored by Team B players) */}
                            {teamAOwnGoals.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-orange-200">
                                {teamAOwnGoals.map((og) => (
                                  <div key={og.id || og.player_id} className="py-1">
                                    <span className="text-sm text-orange-600 font-medium">
                                      {og.player_name} — OG ({og.minute}')
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    {/* Team B Goals */}
                    <div className="flex-1 sm:pl-4 text-center border-t sm:border-t-0 border-gray-200 pt-4 sm:pt-0">
                      {(() => {
                        const teamBGoals = details.goals.filter(goal => goal.team === 'B')
                        const groupedGoals = teamBGoals.reduce((acc, goal) => {
                          if (!acc[goal.scorer]) {
                            acc[goal.scorer] = []
                          }
                          acc[goal.scorer].push(goal.minute)
                          return acc
                        }, {} as Record<string, number[]>)

                        const teamBOwnGoals = details.own_goals?.filter(og => og.team === 'B') || []

                        return (
                          <>
                            {Object.keys(groupedGoals).length > 0 ? (
                              Object.entries(groupedGoals)
                                .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]))
                                .map(([scorer, minutes]) => (
                                  <div key={scorer} className="py-1">
                                    <span className="text-sm text-gray-700">
                                      {scorer} ({minutes.sort((a, b) => a - b).join("', ")}')
                                    </span>
                                  </div>
                                ))
                            ) : (
                              <div className="text-sm text-gray-500 italic">No goals</div>
                            )}
                            {/* Own Goals for Team B (scored by Team A players) */}
                            {teamBOwnGoals.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-orange-200">
                                {teamBOwnGoals.map((og) => (
                                  <div key={og.id || og.player_id} className="py-1">
                                    <span className="text-sm text-orange-600 font-medium">
                                      {og.player_name} — OG ({og.minute}')
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Goals Timeline */}
        {(() => {
          const totalGoals = details.goals.length + (details.own_goals?.length || 0)
          const allEvents = [
            ...details.goals.map(g => ({ ...g, type: 'goal' as const })),
            ...(details.own_goals || []).map(og => ({ ...og, type: 'own_goal' as const, scorer: og.player_name }))
          ].sort((a, b) => a.minute - b.minute)

          return totalGoals > 0 && (
            <Card className="mb-6 border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  Timeline ({totalGoals} {totalGoals === 1 ? 'goal' : 'goals'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allEvents.map((event, index) => {
                    const isOwnGoal = event.type === 'own_goal'
                    return (
                      <div
                        key={index}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg ${
                          isOwnGoal ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0 ${
                            isOwnGoal
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {event.minute}'
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`font-medium text-sm sm:text-base ${isOwnGoal ? 'text-orange-900' : 'text-gray-900'} break-words`}>
                              {event.scorer}
                              {isOwnGoal ? (
                                <span className="ml-2 text-orange-600 font-semibold">— OG</span>
                              ) : (
                                event.assist && ` (${event.assist})`
                              )}
                            </div>
                            {!isOwnGoal && event.assist && (
                              <div className="text-xs sm:text-sm text-gray-600">Assist: {event.assist}</div>
                            )}
                            {isOwnGoal && (
                              <div className="text-xs sm:text-sm text-orange-600">
                                Own goal by {event.scorer}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={`flex-shrink-0 ${
                          event.team === 'A'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className="text-xs sm:text-sm break-words">{event.team === 'A' ? details.teamAName : details.teamBName}</span>
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Cards Section */}
        {details.cards.length > 0 && (
          <Card className="mb-6 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                Cards ({details.cards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {details.cards
                  .sort((a, b) => a.minute - b.minute)
                  .map((card, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold flex-shrink-0">
                          {card.minute}'
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base text-gray-900 break-words">{card.player}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge className={`text-xs sm:text-sm ${card.type === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {card.type.toUpperCase()}
                        </Badge>
                        <Badge className={`text-xs sm:text-sm ${card.team === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          <span className="break-words">{card.team === 'A' ? details.teamAName : details.teamBName}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Substitutions Section */}
        {details.substitutions.length > 0 && (
          <Card className="mb-6 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Substitutions ({details.substitutions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {details.substitutions
                  .sort((a, b) => a.minute - b.minute)
                  .map((sub, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold flex-shrink-0">
                          {sub.minute}'
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 min-w-0 flex-1">
                          <div className="flex items-center min-w-0">
                            <UserX className="h-4 w-4 text-red-500 mr-1 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600 break-words">{sub.playerOut}</span>
                          </div>
                          <div className="text-gray-400 hidden sm:inline">→</div>
                          <div className="flex items-center min-w-0">
                            <UserCheck className="h-4 w-4 text-green-500 mr-1 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600 break-words">{sub.playerIn}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`flex-shrink-0 text-xs sm:text-sm ${sub.team === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                        <span className="break-words">{sub.team === 'A' ? details.teamAName : details.teamBName}</span>
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Section */}
        <Card className="mb-6 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-600" />
              Match Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Possession */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Possession
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{details.teamAName || 'Team A'}</span>
                    <span className="font-semibold">{details.stats.possession_teamA}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${details.stats.possession_teamA}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{details.teamBName || 'Team B'}</span>
                    <span className="font-semibold">{details.stats.possession_teamB}%</span>
                  </div>
                </div>
              </div>

              {/* Shots */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Shots
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{details.stats.shots_teamA}</div>
                    <div className="text-sm text-gray-600">{details.teamAName || 'Team A'}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{details.stats.shots_teamB}</div>
                    <div className="text-sm text-gray-600">{details.teamBName || 'Team B'}</div>
                  </div>
                </div>
              </div>

              {/* Shots on Target */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Shots on Target
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{details.stats.shots_on_target_teamA}</div>
                    <div className="text-sm text-gray-600">{details.teamAName || 'Team A'}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{details.stats.shots_on_target_teamB}</div>
                    <div className="text-sm text-gray-600">{details.teamBName || 'Team B'}</div>
                  </div>
                </div>
              </div>

              {/* Fouls */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Fouls
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{details.stats.fouls_teamA}</div>
                    <div className="text-sm text-gray-600">{details.teamAName || 'Team A'}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{details.stats.fouls_teamB}</div>
                    <div className="text-sm text-gray-600">{details.teamBName || 'Team B'}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Summary */}
        {details.match_summary && (
          <Card className="mb-6 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-600" />
                Match Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{details.match_summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Team Players */}
        <Card className="mb-6 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Team Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A Players */}
              <div className="space-y-3">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                  <h4 className="font-semibold text-gray-800">{details.teamAName || 'Team A'}</h4>
                </div>
                {details.teamAPlayers && details.teamAPlayers.length > 0 ? (
                  <div className="space-y-2">
                    {details.teamAPlayers.map((player, index) => (
                      <div key={index} className="flex items-center p-2 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                        <span className="text-gray-700">{player}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm italic">No players assigned</div>
                )}
              </div>

              {/* Team B Players */}
              <div className="space-y-3">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                  <h4 className="font-semibold text-gray-800">{details.teamBName || 'Team B'}</h4>
                </div>
                {details.teamBPlayers && details.teamBPlayers.length > 0 ? (
                  <div className="space-y-2">
                    {details.teamBPlayers.map((player, index) => (
                      <div key={index} className="flex items-center p-2 bg-red-50 rounded-lg">
                        <div className="w-2 h-2 bg-red-600 rounded-full mr-3"></div>
                        <span className="text-gray-700">{player}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm italic">No players assigned</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

