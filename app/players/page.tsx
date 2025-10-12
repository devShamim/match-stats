'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import PlayerCard from '@/components/PlayerCard'
import PlayerEditModal from '@/components/PlayerEditModal'
import { Player } from '@/types'
import { Plus, Users, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function PlayersPage() {
  const { isAdmin } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Fetch players
  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/players', {
        cache: 'no-store',
        next: { revalidate: 0 }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch players')
      }
      const data = await response.json()
      setPlayers(data.players || [])
      setFilteredPlayers(data.players || [])
    } catch (error: any) {
      console.error('Error fetching players:', error)
      showToast('Failed to load players', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter players based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players)
    } else {
      const filtered = players.filter(player =>
        player.user_profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.user_profile?.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.jersey_number?.toString().includes(searchTerm) ||
        player.preferred_position?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPlayers(filtered)
    }
  }, [searchTerm, players])

  // Load players on component mount
  useEffect(() => {
    fetchPlayers()
  }, [])

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player)
    setIsEditModalOpen(true)
  }

  const handleViewStats = (player: Player) => {
    router.push(`/player/${player.id}`)
  }

  const handleSavePlayer = (updatedPlayer: Player) => {
    setPlayers(prev =>
      prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
    )
    setFilteredPlayers(prev =>
      prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
    )
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setEditingPlayer(null)
  }

  const handleDeletePlayer = (player: Player) => {
    setDeletingPlayer(player)
    setIsDeleteModalOpen(true)
  }

  const confirmDeletePlayer = async () => {
    if (!deletingPlayer) return

    try {
      const response = await fetch(`/api/players/${deletingPlayer.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete player')
      }

      // Remove player from state
      setPlayers(prev => prev.filter(p => p.id !== deletingPlayer.id))
      setFilteredPlayers(prev => prev.filter(p => p.id !== deletingPlayer.id))

      showToast('Player deleted successfully', 'success')
    } catch (error: any) {
      console.error('Error deleting player:', error)
      showToast(error.message || 'Failed to delete player', 'error')
    } finally {
      setIsDeleteModalOpen(false)
      setDeletingPlayer(null)
    }
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingPlayer(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading players...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-600 mt-2">Manage team players and view their stats</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/admin/create-player">
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Stats */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline" className="text-sm">
            {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Players Grid */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={handleEditPlayer}
              onViewStats={handleViewStats}
              onDelete={handleDeletePlayer}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {searchTerm ? 'No Players Found' : 'No Players Yet'}
            </CardTitle>
            <CardDescription>
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Add players to start tracking their stats'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? 'No players match your search criteria.'
                : 'Players will appear here once they are added to the system.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <PlayerEditModal
        player={editingPlayer}
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePlayer}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Player</CardTitle>
              <CardDescription>
                Are you sure you want to delete this player? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Player Details:</h4>
                <p className="text-red-700">
                  <strong>Name:</strong> {deletingPlayer.user_profile?.name || 'Unknown'}<br />
                  <strong>Email:</strong> {deletingPlayer.user_profile?.email || 'N/A'}<br />
                  <strong>Position:</strong> {deletingPlayer.user_profile?.position || 'N/A'}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Warning:</h4>
                <p className="text-yellow-700 text-sm">
                  This will permanently delete:
                  <br />• Player profile and user account
                  <br />• Supabase authentication account
                  <br />• All match statistics and records
                  <br />• All match participation history
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={confirmDeletePlayer}
                  variant="destructive"
                  className="flex-1"
                >
                  Yes, Delete Player
                </Button>
                <Button
                  onClick={handleCloseDeleteModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
