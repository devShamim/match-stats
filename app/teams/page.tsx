'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import { PersistentTeam } from '@/types'
import { Plus, Users, Search, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function TeamsPage() {
  const { isAdmin } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const [teams, setTeams] = useState<PersistentTeam[]>([])
  const [filteredTeams, setFilteredTeams] = useState<PersistentTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingTeam, setDeletingTeam] = useState<PersistentTeam | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTeams(filtered)
    } else {
      setFilteredTeams(teams)
    }
  }, [searchTerm, teams])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }
      const data = await response.json()
      setTeams(data.teams || [])
      setFilteredTeams(data.teams || [])
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      showToast('Failed to load teams', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = (team: PersistentTeam, e?: React.MouseEvent) => {
    // Prevent navigating into the team detail page when clicking delete
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setDeletingTeam(team)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingTeam(null)
  }

  const confirmDeleteTeam = async () => {
    if (!deletingTeam) return

    try {
      setIsDeleting(true)
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in as admin', 'error')
        return
      }

      const response = await fetch(`/api/teams/${deletingTeam.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete team')
      }

      // Remove from state immediately for a snappy UI
      setTeams((prev) => prev.filter((t) => t.id !== deletingTeam.id))
      setFilteredTeams((prev) => prev.filter((t) => t.id !== deletingTeam.id))
      showToast('Team deleted successfully', 'success')
      closeDeleteModal()
    } catch (error: any) {
      console.error('Error deleting team:', error)
      showToast(error.message || 'Failed to delete team', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teams</h1>
          <p className="text-gray-600">Manage persistent teams for tournaments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push('/teams/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400 mb-4">No teams found</p>
            {isAdmin && (
              <Button onClick={() => router.push('/teams/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Team
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      {team.color && (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                      )}
                      {team.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-gray-300">
                        <Users className="h-3 w-3 mr-1" />
                        {(team as any).player_count ?? team.players?.length ?? 0}
                      </Badge>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          aria-label={`Delete team ${team.name}`}
                          onClick={(e) => handleDeleteTeam(team, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {team.captain && (
                    <CardDescription className="text-gray-400">
                      Captain: {team.captain.user_profile?.name || 'N/A'}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal (Admin only) */}
      {isAdmin && isDeleteModalOpen && deletingTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-red-400">Delete Team</CardTitle>
              <CardDescription className="text-gray-400">
                Are you sure you want to delete this team? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4">
                <h4 className="font-semibold text-red-300 mb-2">Team Details</h4>
                <p className="text-red-200 text-sm">
                  <strong>Name:</strong> {deletingTeam.name}
                  <br />
                  <strong>Players:</strong> {(deletingTeam as any).player_count ?? deletingTeam.players?.length ?? 0}
                </p>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Warning</h4>
                <p className="text-yellow-200 text-sm">
                  Deleting this team will also remove it from tournaments (and any related team-player links).
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={confirmDeleteTeam}
                  variant="destructive"
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Yes, Delete Team'}
                </Button>
                <Button
                  onClick={closeDeleteModal}
                  variant="outline"
                  className="flex-1"
                  disabled={isDeleting}
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
