'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import MatchCard from '@/components/MatchCard'
import ScoreUpdateModal from '@/components/ScoreUpdateModal'
import MatchDetailsModal from '@/components/MatchDetailsModal'
import MatchDetailsView from '@/components/MatchDetailsView'
import { Match } from '@/types'
import { Plus, Calendar, Search, Loader2, Filter, Star, Trophy, Target, Zap, Shield, Save } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function MatchesPage() {
  const { isAdmin } = useUser()
  const { showToast } = useToast()
  const [matches, setMatches] = useState<Match[]>([])
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [updatingMatch, setUpdatingMatch] = useState<Match | null>(null)
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false)
  const [detailsMatch, setDetailsMatch] = useState<Match | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [viewMatch, setViewMatch] = useState<Match | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Fetch matches
  const fetchMatches = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/matches?t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch matches')
      }
      const data = await response.json()
      setMatches(data.matches || [])
      setFilteredMatches(data.matches || [])
    } catch (error: any) {
      console.error('Error fetching matches:', error)
      showToast('Failed to load matches', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter matches based on search term and filters
  useEffect(() => {
    let filtered = matches

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(match =>
        (match.type === 'internal' ? 'Internal Match' : match.opponent || 'External Match')
          .toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(match => match.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(match => match.type === typeFilter)
    }

    setFilteredMatches(filtered)
  }, [searchTerm, statusFilter, typeFilter, matches])

  // Load matches on component mount and set up realtime subscription
  useEffect(() => {
    fetchMatches()

    // Set up Supabase Realtime subscription for matches table
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        (payload) => {
          console.log('Matches table change detected:', payload)
          fetchMatches() // Refresh data automatically
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        (payload) => {
          console.log('Teams table change detected:', payload)
          fetchMatches() // Refresh data automatically
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateScore = (match: Match) => {
    setUpdatingMatch(match)
    setIsScoreModalOpen(true)
  }

  const handleSaveScore = (updatedMatch: Match) => {
    setMatches(prev =>
      prev.map(m => m.id === updatedMatch.id ? updatedMatch : m)
    )
    setFilteredMatches(prev =>
      prev.map(m => m.id === updatedMatch.id ? updatedMatch : m)
    )
    // Force refetch to ensure we have the latest data
    fetchMatches()
  }

  const handleCloseModal = () => {
    setIsScoreModalOpen(false)
    setUpdatingMatch(null)
  }

  const handleViewDetails = (match: Match) => {
    if (isAdmin) {
      // Admin can edit details
      setDetailsMatch(match)
      setIsDetailsModalOpen(true)
    } else {
      // Non-admin users can only view
      setViewMatch(match)
      setIsViewModalOpen(true)
    }
  }

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setDetailsMatch(null)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setViewMatch(null)
  }

  const handleDeleteMatch = (match: Match) => {
    setDeletingMatch(match)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteMatch = async () => {
    if (!deletingMatch) return

    try {
      const response = await fetch(`/api/matches/${deletingMatch.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete match')
      }

      // Remove match from state
      setMatches(prev => prev.filter(m => m.id !== deletingMatch.id))
      setFilteredMatches(prev => prev.filter(m => m.id !== deletingMatch.id))

      showToast('Match deleted successfully', 'success')
    } catch (error: any) {
      console.error('Error deleting match:', error)
      showToast(error.message || 'Failed to delete match', 'error')
    } finally {
      setIsDeleteModalOpen(false)
      setDeletingMatch(null)
    }
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingMatch(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading matches...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-b-3xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent transform -skew-x-12"></div>
        </div>

        <div className="relative px-6 py-16">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center mb-6">
                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mr-4">
                  <Calendar className="h-4 w-4 text-pink-300 mr-2" />
                  <span className="text-white font-medium text-sm">Total Matches</span>
                </div>
                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Star className="h-4 w-4 text-pink-300 mr-2" />
                  <span className="text-white font-medium text-sm">{filteredMatches.length} Matches</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold text-white mb-4">
                Matches
              </h1>
              <p className="text-white/80 text-lg mb-8 max-w-2xl">
                Track game results and relive the excitement of every match
              </p>

              {/* Search Bar */}
              <div className="max-w-lg">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search matches by teams, location, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-white/95 backdrop-blur-sm border-0 rounded-2xl text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-pink-400 text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center">
                <p className="text-white/70 text-sm mb-3 font-medium">Total Matches</p>
                <div className="text-4xl font-bold text-white mb-3">
                  {filteredMatches.length}
                </div>
                <div className="w-20 h-1 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm bg-white border-gray-200 text-gray-700 h-9 rounded-lg">
              <Calendar className="h-4 w-4 mr-1" />
              {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
            </Badge>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex h-9 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="all">All Types</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <Button asChild className="bg-pink-600 hover:bg-pink-700 text-white">
              <Link href="/admin/create-match">
                <Plus className="h-4 w-4 mr-2" />
                Add Match
              </Link>
            </Button>
          )}
        </div>

        {/* Matches Grid */}
        {filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredMatches.map((match, index) => (
              <MatchCard
                key={match.id}
                match={match}
                onUpdateScore={handleUpdateScore}
                onViewDetails={handleViewDetails}
                onDelete={handleDeleteMatch}
                isAdmin={isAdmin}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                <Calendar className="h-12 w-12 text-pink-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'No Matches Found' : 'No Matches Yet'}
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search terms or filters'
                  : 'Add matches to start tracking game results'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-12">
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No matches match your search criteria.'
                  : 'Matches will appear here once they are added to the system.'
                }
              </p>
              {isAdmin && !searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <Button asChild className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
                  <Link href="/admin/create-match">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Match
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Score Update Modal */}
      <ScoreUpdateModal
        match={updatingMatch}
        isOpen={isScoreModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveScore}
      />

      {/* Match Details Modal (Admin Edit) */}
      <MatchDetailsModal
        match={detailsMatch}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        onSave={handleSaveScore}
      />

      {/* Match Details View (Read-only) */}
      <MatchDetailsView
        match={viewMatch}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Match</CardTitle>
              <CardDescription>
                Are you sure you want to delete this match? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Match Details:</h4>
                <p className="text-red-700">
                  <strong>Teams:</strong> {(deletingMatch as any).teamA_name || 'Team A'} vs {(deletingMatch as any).teamB_name || 'Team B'}<br />
                  <strong>Date:</strong> {new Date(deletingMatch.date).toLocaleDateString()}<br />
                  <strong>Type:</strong> {deletingMatch.type}<br />
                  <strong>Status:</strong> {deletingMatch.status}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Warning:</h4>
                <p className="text-yellow-700 text-sm">
                  This will permanently delete:
                  <br />• Match record and all details
                  <br />• All player statistics for this match
                  <br />• All match events (goals, cards, substitutions)
                  <br />• All team assignments for this match
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={confirmDeleteMatch}
                  variant="destructive"
                  className="flex-1"
                >
                  Yes, Delete Match
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
