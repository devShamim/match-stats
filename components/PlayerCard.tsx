'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PlayerAvatar from '@/components/PlayerAvatar'
import { Player } from '@/types'
import { Edit, Mail, Phone, Shirt, MapPin, Calendar, TrendingUp, Trash2, Star, Trophy, Target, Zap, Shield, Save } from 'lucide-react'

interface PlayerCardProps {
  player: Player
  onEdit: (player: Player) => void
  onViewStats: (player: Player) => void
  onDelete: (player: Player) => void
  isAdmin?: boolean
  index?: number
}

export default function PlayerCard({ player, onEdit, onViewStats, onDelete, isAdmin = false, index = 0 }: PlayerCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [playerStats, setPlayerStats] = useState({
    goals: 0,
    assists: 0,
    matches: 0,
    loading: true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Fetch player stats
  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setPlayerStats(prev => ({ ...prev, loading: true }))
        const response = await fetch(`/api/player-stats?playerId=${player.id}`)

        if (response.ok) {
          const data = await response.json()

          // Check if data.stats exists and has the expected structure
          const stats = data.stats || data

          setPlayerStats({
            goals: stats.total_goals || 0,
            assists: stats.total_assists || 0,
            matches: stats.matches_played || 0,
            loading: false
          })
        } else {
          const errorData = await response.json()
          setPlayerStats({
            goals: 0,
            assists: 0,
            matches: 0,
            loading: false
          })
        }
      } catch (error) {
        console.error('Error fetching player stats:', error)
        setPlayerStats({
          goals: 0,
          assists: 0,
          matches: 0,
          loading: false
        })
      }
    }

    fetchPlayerStats()
  }, [player.id])

  // Use consistent blue accent for all cards
  const accent = 'blue'

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        {/* Header with Avatar and Actions */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <PlayerAvatar
                imageUrl={player.user_profile?.photo_url}
                name={player.user_profile?.name}
                size="lg"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {player.user_profile?.name || 'Unknown Player'}
              </h3>
              <p className="text-sm text-blue-600 font-medium">
                {player.user_profile?.position || 'No position set'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(player)}
                className={`transition-all duration-200 hover:bg-gray-100 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(player)}
                className={`transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Key Stats - Dynamic */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="text-center">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Goals</p>
            <p className="text-sm font-semibold text-gray-900">
              {playerStats.loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              ) : (
                playerStats.goals
              )}
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Assists</p>
            <p className="text-sm font-semibold text-gray-900">
              {playerStats.loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              ) : (
                playerStats.assists
              )}
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Matches</p>
            <p className="text-sm font-semibold text-gray-900">
              {playerStats.loading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              ) : (
                playerStats.matches
              )}
            </p>
          </div>
        </div>

        {/* Player Details - Minimal */}
        <div className="space-y-2 mb-6">
          {player.jersey_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Jersey</span>
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                #{player.jersey_number}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <Badge className={`${player.user_profile?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} text-xs`}>
              {player.user_profile?.status === 'approved' ? 'Active' : 'Pending'}
            </Badge>
          </div>
        </div>

        {/* Action Button - Always visible but less focus */}
        <Button
          onClick={() => onViewStats(player)}
          className="w-full bg-gray-100 text-gray-700 hover:text-white transition-all duration-200"
        >
          <TrendingUp className="h-4 w-4 mr-2" /> View Stats
        </Button>
      </CardContent>
    </Card>
  );
}
