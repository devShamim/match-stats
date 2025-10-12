'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Users, Calendar, Trophy, Target, Award } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DashboardData {
  totalPlayers: number
  totalMatches: number
  totalGoals: number
  topScorer: {
    name: string
    goals: number
  }
  recentMatches: Array<{
    id: string
    type: string
    date: string
    teamA: string
    teamB: string
    scoreA: number
    scoreB: number
  }>
  upcomingMatches: Array<{
    id: string
    type: string
    date: string
    teamA: string
    teamB: string
    location: string
  }>
  topScorers: Array<{
    name: string
    goals: number
    assists: number
  }>
  topAssisters: Array<{
    name: string
    assists: number
    goals: number
  }>
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard', {
          cache: 'no-store',
          next: { revalidate: 0 }
        })
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || 'Failed to fetch dashboard data')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-red-600 mt-2">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the Football Stats Tracker</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Registered players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMatches}</div>
            <p className="text-xs text-muted-foreground">
              Matches played
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalGoals}</div>
            <p className="text-xs text-muted-foreground">
              Goals scored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Scorer</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topScorer.name}</div>
            <p className="text-xs text-muted-foreground">
              {data.topScorer.goals} goals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
            <CardDescription>Latest match results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentMatches.length > 0 ? (
                data.recentMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          match.type === 'Internal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {match.type}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(match.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="text-sm font-medium">{match.teamA}</span>
                        <span className="text-sm text-gray-500">vs</span>
                        <span className="text-sm font-medium">{match.teamB}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {match.scoreA} - {match.scoreB}
                      </div>
                      <div className="text-xs text-gray-500">
                        {match.scoreA > match.scoreB ? `${match.teamA} won` :
                         match.scoreB > match.scoreA ? `${match.teamB} won` : 'Draw'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent matches found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>Scheduled matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingMatches.length > 0 ? (
                data.upcomingMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{match.type} Match</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(match.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{match.teamA} vs {match.teamB}</p>
                      <p className="text-xs text-muted-foreground">{match.location}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No upcoming matches scheduled</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Leading goal scorers and assist makers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Top Scorers */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Target className="h-4 w-4 text-orange-500" />
                  <h4 className="font-medium text-sm">Top Scorers</h4>
                </div>
                <div className="space-y-2">
                  {data.topScorers.slice(0, 3).map((player, index) => (
                    <div key={player.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{player.name}</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600">{player.goals}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Assisters */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Award className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-sm">Top Assisters</h4>
                </div>
                <div className="space-y-2">
                  {data.topAssisters.slice(0, 3).map((player, index) => (
                    <div key={player.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{player.name}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{player.assists}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireApproved={true}>
      <DashboardContent />
    </ProtectedRoute>
  )
}