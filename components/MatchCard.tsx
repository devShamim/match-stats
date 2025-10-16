'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Match } from '@/types'
import { Calendar, MapPin, Users, Trophy, Edit, Clock, Info, Trash2 } from 'lucide-react'

interface MatchCardProps {
  match: Match
  onUpdateScore: (match: Match) => void
  onViewDetails: (match: Match) => void
  onDelete: (match: Match) => void
  isAdmin?: boolean
  index?: number
}

export default function MatchCard({ match, onUpdateScore, onViewDetails, onDelete, isAdmin = false, index = 0 }: MatchCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  // Simple accent color based on index
  const accentColors = ['pink', 'purple', 'rose', 'fuchsia', 'violet', 'indigo']
  const accent = accentColors[index % accentColors.length]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        {/* Header with Match Info and Actions */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {(match as any).teamA_name || 'Team A'} vs {(match as any).teamB_name || 'Team B'}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(match.date)}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(match.date)}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-1">
              {match.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdateScore(match)}
                  className={`transition-all duration-200 hover:bg-gray-100 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(match)}
                className={`transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="text-center flex-1">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {(match as any).score_teama || 0}
            </div>
            <div className="text-sm text-gray-600">{(match as any).teamA_name || 'Team A'}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-lg font-semibold text-gray-500">VS</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {(match as any).score_teamb || 0}
            </div>
            <div className="text-sm text-gray-600">{(match as any).teamB_name || 'Team B'}</div>
          </div>
        </div>

        {/* Match Details */}
        <div className="space-y-2 mb-6">
          {match.location && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Location</span>
              <span className="text-gray-900 font-medium">{match.location}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <Badge className={`${getStatusColor(match.status)} text-xs`}>
              {match.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Type</span>
            <Badge className={`${match.type === 'internal' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'} text-xs`}>
              {match.type.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onViewDetails(match)}
          className="w-full bg-gray-100 text-gray-700 hover:text-white transition-all duration-200"
        >
          <Info className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}
