'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Match } from '@/types'
import {
  X, Clock, Trophy, Users, Target, Zap, AlertTriangle,
  UserCheck, UserX, Shield, Calendar, MapPin, Star,
  TrendingUp, Activity, Award, Timer
} from 'lucide-react'

interface MatchDetailsViewProps {
  match: Match | null
  isOpen: boolean
  onClose: () => void
}

interface Goal {
  id?: string
  minute: number
  scorer: string
  assist?: string
  team: 'A' | 'B'
}

interface Card {
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
  cards: Card[]
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

export default function MatchDetailsView({ match, isOpen, onClose }: MatchDetailsViewProps) {
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

  // Load match details when modal opens
  useEffect(() => {
    if (match && isOpen) {
      loadMatchDetails()
    }
  }, [match, isOpen])

  const loadMatchDetails = async () => {
    if (!match) return

    try {
      const response = await fetch(`/api/match-details/${match.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.details) {
          setDetails(prev => ({
            ...prev,
            ...data.details,
            // Ensure we have default values if some are missing
            goals: data.details.goals || [],
            cards: data.details.cards || [],
            substitutions: data.details.substitutions || [],
            stats: data.details.stats || prev.stats,
            match_summary: data.details.match_summary || '',
            teamAName: data.details.teamAName || 'Team A',
            teamBName: data.details.teamBName || 'Team B',
            teamAPlayers: data.details.teamAPlayers || [],
            teamBPlayers: data.details.teamBPlayers || []
          }))
        }
      }
    } catch (error) {
      console.error('Error loading match details:', error)
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

  if (!isOpen || !match) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center text-2xl">
                <Trophy className="h-6 w-6 mr-3 text-yellow-600" />
                {match.type === 'internal' ? 'Internal Match' : match.opponent || 'External Match'}
              </CardTitle>
              <CardDescription className="mt-2 flex items-center space-x-4 text-base">
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
                    {match.location}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Match Status and Type */}
          <div className="flex items-center space-x-3 mt-4">
            <Badge className={`${getStatusColor(match.status)} text-sm px-3 py-1`}>
              {match.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={`${getTypeColor(match.type)} text-sm px-3 py-1`}>
              {match.type.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Score Display */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Final Score</h3>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center flex-1">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {(match as any).score_teama || 0}
                </div>
                <div className="text-lg font-medium text-gray-600">{details.teamAName || 'Team A'}</div>
                {details.clean_sheet_teamA && (
                  <div className="flex items-center justify-center mt-2">
                    <Shield className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">Clean Sheet</span>
                  </div>
                )}
              </div>
              <div className="text-center px-8">
                <div className="text-2xl font-bold text-gray-500">VS</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {(match as any).score_teamb || 0}
                </div>
                <div className="text-lg font-medium text-gray-600">{details.teamBName || 'Team B'}</div>
                {details.clean_sheet_teamB && (
                  <div className="flex items-center justify-center mt-2">
                    <Shield className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600 font-medium">Clean Sheet</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Goals Section */}
          {details.goals.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  Goals ({details.goals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {details.goals
                    .sort((a, b) => a.minute - b.minute)
                    .map((goal, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          {goal.minute}'
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {goal.scorer} {goal.assist && `(${goal.assist})`}
                          </div>
                          {goal.assist && (
                            <div className="text-sm text-gray-600">Assist: {goal.assist}</div>
                          )}
                        </div>
                      </div>
                      <Badge className={goal.team === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}>
                        Team {goal.team}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards Section */}
          {details.cards.length > 0 && (
            <Card className="mb-6">
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
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                          {card.minute}'
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{card.player}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={card.type === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                          {card.type.toUpperCase()}
                        </Badge>
                        <Badge className={card.team === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}>
                          Team {card.team}
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
            <Card className="mb-6">
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
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                          {sub.minute}'
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <UserX className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-sm text-gray-600">{sub.playerOut}</span>
                          </div>
                          <div className="text-gray-400">→</div>
                          <div className="flex items-center">
                            <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-gray-600">{sub.playerIn}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={sub.team === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}>
                        Team {sub.team}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Section */}
          <Card className="mb-6">
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
            <Card>
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
          <Card>
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
        </CardContent>
      </Card>
    </div>
  )
}
