'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import PlayerAvatar from '@/components/PlayerAvatar'
import { Trophy, Target, Users, Award, Clock, TrendingUp, Shield, Save, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PlayerStats {
  id: string
  name: string
  photo_url?: string
  goals: number
  assists: number
  own_goals?: number
  yellow_cards: number
  red_cards: number
  clean_sheets: number
  saves: number
  matches_played: number
  total_minutes: number
  goals_per_match: number
  assists_per_match: number
  unified_score?: number
  score_breakdown?: {
    goals: number
    assists: number
    saves: number
    clean_sheets: number
    own_goals: number
  }
}

interface LeaderboardsData {
  topGoalScorers: PlayerStats[]
  topAssistMakers: PlayerStats[]
  mostActivePlayers: PlayerStats[]
  goalsPerMatch: PlayerStats[]
  topPerformers: PlayerStats[]
  mostMinutesPlayed: PlayerStats[]
  topCleanSheets: PlayerStats[]
  topSaves: PlayerStats[]
}

export default function LeaderboardsPage() {
  const [data, setData] = useState<LeaderboardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboardsData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/leaderboards?t=${Date.now()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboards data')
        }
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || 'Failed to fetch leaderboards data')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboardsData()
  }, [])

  const renderLeaderboard = (players: PlayerStats[], title: string, icon: React.ReactNode, getValue: (player: PlayerStats) => number, getLabel: (player: PlayerStats) => string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
          {icon}
          {title}
          </div>
          {title === 'Top Performers' && (
            <Tooltip content="Unified scoring: Goals (3pts), Assists (2pts), Saves (0.5pts), Clean Sheets (2pts), Own Goals (-2pts)">
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
            </Tooltip>
          )}
        </CardTitle>
        {title !== 'Top Performers' && (
        <CardDescription>
          {title.toLowerCase()}
        </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-300 rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : players.length > 0 ? (
          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <PlayerAvatar
                      imageUrl={player.photo_url}
                      name={player.name}
                      size="sm"
                    />
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <Link href={`/player/${player.id}`} className="hover:text-blue-600 transition-colors">
                      <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">{player.name}</div>
                    </Link>
                    <div className="text-xs text-gray-500">
                      {player.matches_played} match{player.matches_played !== 1 ? 'es' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{getValue(player)}</div>
                  <div className="text-xs text-gray-500">{getLabel(player)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No data available yet. Play some matches to see the leaderboard!
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
          <p className="text-red-600 mt-2">Error: {error}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
        <p className="text-gray-600 mt-2">Top performers and statistics</p>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Goal Scorers */}
          {renderLeaderboard(
            data.topGoalScorers,
            'Top Goal Scorers',
            <Target className="h-5 w-5 mr-2" />,
            (player) => player.goals,
            (player) => `${player.goals} goal${player.goals !== 1 ? 's' : ''}`
          )}

          {/* Top Assist Makers */}
          {renderLeaderboard(
            data.topAssistMakers,
            'Top Assist Makers',
            <Users className="h-5 w-5 mr-2" />,
            (player) => player.assists,
            (player) => `${player.assists} assist${player.assists !== 1 ? 's' : ''}`
          )}

          {/* Most Active Players */}
          {renderLeaderboard(
            data.mostActivePlayers,
            'Most Active Players',
            <Trophy className="h-5 w-5 mr-2" />,
            (player) => player.matches_played,
            (player) => `${player.matches_played} match${player.matches_played !== 1 ? 'es' : ''}`
          )}

          {/* Goals per Match */}
          {renderLeaderboard(
            data.goalsPerMatch,
            'Goals per Match',
            <Target className="h-5 w-5 mr-2" />,
            (player) => player.goals_per_match,
            (player) => `${player.goals_per_match} per match`
          )}

          {/* Top Performers (Unified Scoring System) */}
          {renderLeaderboard(
            data.topPerformers,
            'Top Performers',
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />,
            (player) => player.unified_score || 0,
            (player) => {
              const breakdown = player.score_breakdown
              if (breakdown) {
                const parts = []
                if (player.goals > 0) parts.push(`${player.goals}G`)
                if (player.assists > 0) parts.push(`${player.assists}A`)
                if (player.saves > 0) parts.push(`${player.saves}Sv`)
                if (player.clean_sheets > 0) parts.push(`${player.clean_sheets}CS`)
                if (player.own_goals && player.own_goals > 0) parts.push(`${player.own_goals}OG`)
                return parts.length > 0 ? parts.join(' ') : '0 pts'
              }
              return `${player.goals}G ${player.assists}A`
            }
          )}

          {/* Most Minutes Played */}
          {renderLeaderboard(
            data.mostMinutesPlayed,
            'Most Minutes Played',
            <Clock className="h-5 w-5 mr-2" />,
            (player) => player.total_minutes,
            (player) => `${player.total_minutes} minutes`
          )}

          {/* Top Clean Sheets */}
          {renderLeaderboard(
            data.topCleanSheets,
            'Top Clean Sheets',
            <Shield className="h-5 w-5 mr-2" />,
            (player) => player.clean_sheets,
            (player) => `${player.clean_sheets} clean sheet${player.clean_sheets !== 1 ? 's' : ''}`
          )}

          {/* Top Saves */}
          {renderLeaderboard(
            data.topSaves,
            'Top Saves',
            <Save className="h-5 w-5 mr-2" />,
            (player) => player.saves,
            (player) => `${player.saves} save${player.saves !== 1 ? 's' : ''}`
          )}
        </div>
      )}
    </div>
  )
}
