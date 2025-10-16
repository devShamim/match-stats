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
import { Plus, Users, Search, Loader2, Star, Trophy, Target, Zap, Shield, Save } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

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
      const response = await fetch(`/api/players?t=${Date.now()}`)
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

  // Load players on component mount and set up realtime subscription
  useEffect(() => {
    fetchPlayers()

    // Set up Supabase Realtime subscription for players table
    const channel = supabase
      .channel('players-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players'
        },
        (payload) => {
          console.log('Players table change detected:', payload)
          fetchPlayers() // Refresh data automatically
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('User profiles table change detected:', payload)
          fetchPlayers() // Refresh data automatically (This is needed to update the player's name and email in the players list
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
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
    // Force refetch to ensure we have the latest data
    fetchPlayers()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-b-3xl">
        <div className="relative px-6 py-16">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center mb-6">
                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mr-4">
                  <Users className="h-4 w-4 text-blue-300 mr-2" />
                  <span className="text-white font-medium text-sm">TEAM ROSTER</span>
                </div>
                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Star className="h-4 w-4 text-blue-300 mr-2" />
                  <span className="text-white font-medium text-sm">{filteredPlayers.length} Players</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold text-white mb-4">
                Players
              </h1>
              <p className="text-white/80 text-lg mb-8 max-w-2xl">
                Meet the talented individuals who make our team great
              </p>

              {/* Search Bar */}
              <div className="max-w-lg">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search players by name, position, or jersey number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-gray-100 border-0 rounded-2xl text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-8 text-center">
                <p className="text-white/70 text-sm mb-3 font-medium">Total Players</p>
                <div className="text-4xl font-bold text-white mb-3">
                  {filteredPlayers.length}
                </div>
                <div className="w-20 h-1 bg-gradient-to-r from-indigo-400 to-indigo-300 rounded-full mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Action Bar */}
        <div className="flex items-center mb-8 justify-end">
            {isAdmin && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/admin/create-player">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Player
                </Link>
              </Button>
            )}
        </div>

        {/* Players Grid */}
        {filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                onEdit={handleEditPlayer}
                onViewStats={handleViewStats}
                onDelete={handleDeletePlayer}
                isAdmin={isAdmin}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                {searchTerm ? 'No Players Found' : 'No Players Yet'}
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Add players to start tracking their stats'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-12">
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? 'No players match your search criteria.'
                  : 'Players will appear here once they are added to the system.'
                }
              </p>
              {isAdmin && !searchTerm && (
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <Link href="/admin/create-player">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Player
                  </Link>
                </Button>
              )}
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
    </div>
  )
}
