'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PlayerAvatar from '@/components/PlayerAvatar'
import { Player } from '@/types'
import { Edit, Mail, Phone, Shirt, MapPin, Calendar, TrendingUp, Trash2 } from 'lucide-react'

interface PlayerCardProps {
  player: Player
  onEdit: (player: Player) => void
  onViewStats: (player: Player) => void
  onDelete: (player: Player) => void
  isAdmin?: boolean
}

export default function PlayerCard({ player, onEdit, onViewStats, onDelete, isAdmin = false }: PlayerCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card
      className="transition-all duration-200 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <PlayerAvatar
              imageUrl={player.user_profile?.photo_url}
              name={player.user_profile?.name}
              size="lg"
            />
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {player.user_profile?.name || 'Unknown Player'}
              </CardTitle>
              <CardDescription className="mt-1">
                {player.user_profile?.position || 'No position set'}
              </CardDescription>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(player)}
                className={`transition-opacity duration-200 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(player)}
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

      <CardContent className="space-y-3">
        {/* Player Info */}
        <div className="space-y-2">
          {player.user_profile?.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              <span className="truncate">{player.user_profile.email}</span>
            </div>
          )}

          {player.user_profile?.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              <span>{player.user_profile.phone}</span>
            </div>
          )}

          {player.jersey_number && (
            <div className="flex items-center text-sm text-gray-600">
              <Shirt className="h-4 w-4 mr-2 text-gray-400" />
              <span>Jersey #{player.jersey_number}</span>
            </div>
          )}

          {player.preferred_position && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span>Prefers {player.preferred_position}</span>
            </div>
          )}
        </div>

        {/* Status and Date */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Badge
            variant={player.user_profile?.status === 'approved' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {player.user_profile?.status || 'Unknown'}
          </Badge>

          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            <span>Joined {formatDate(player.created_at)}</span>
          </div>
        </div>

        {/* View Stats Button */}
        <div className="pt-3">
          <Button
            onClick={() => onViewStats(player)}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            View Stats
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
