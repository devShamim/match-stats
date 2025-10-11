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
}

export default function MatchCard({ match, onUpdateScore, onViewDetails, onDelete, isAdmin = false }: MatchCardProps) {
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

  return (
    <Card
      className="transition-all duration-200 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              { (match as any).teamA_name ? (match as any).teamA_name : 'Team A' } <span className="text-gray-500">vs</span> { (match as any).teamB_name ? (match as any).teamB_name : 'Team B' }
            </CardTitle>
            <CardDescription className="mt-1 flex items-center space-x-4">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(match.date)}
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(match.date)}
              </span>
            </CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              {match.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdateScore(match)}
                  className={`transition-opacity duration-200 ${
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
                className={`transition-opacity duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Match Info */}
        <div className="space-y-2">
          {match.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span>{match.location}</span>
            </div>
          )}
        </div>

        {/* Score Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-900">
                {(match as any).score_teama || 0}
              </div>
              <div className="text-sm text-gray-600"> { (match as any).teamA_name ? (match as any).teamA_name : 'Team A' } </div>
            </div>
            <div className="text-center px-4">
              <div className="text-lg font-semibold text-gray-500">VS</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-900">
                {(match as any).score_teamb || 0}
              </div>
              <div className="text-sm text-gray-600"> { (match as any).teamB_name ? (match as any).teamB_name : 'Team B' } </div>
            </div>
          </div>
        </div>

        {/* Status and Type */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Badge className={getStatusColor(match.status)}>
              {match.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={getTypeColor(match.type)}>
              {match.type.toUpperCase()}
            </Badge>
          </div>

          <div className="text-xs text-gray-500">
            Created {formatDate(match.created_at)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isAdmin && match.status !== 'completed' && (
            <Button
              onClick={() => onUpdateScore(match)}
              className="w-full"
              variant="outline"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Update Score
            </Button>
          )}

          {match.status === 'completed' && (
            <Button
              onClick={() => onViewDetails(match)}
              className="w-full"
              variant="outline"
            >
              <Info className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
