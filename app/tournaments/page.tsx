'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import { Tournament } from '@/types'
import { Plus, Trophy, Search, Loader2, Calendar, Users, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function TournamentsPage() {
  const { isAdmin } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchTournaments()
  }, [])

  useEffect(() => {
    let filtered = tournaments

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    setFilteredTournaments(filtered)
  }, [searchTerm, statusFilter, tournaments])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments')
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments')
      }
      const data = await response.json()
      setTournaments(data.tournaments || [])
      setFilteredTournaments(data.tournaments || [])
    } catch (error: any) {
      console.error('Error fetching tournaments:', error)
      showToast('Failed to load tournaments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400'
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400'
      case 'registration':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'draft':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const handleCompleteTournament = async (e: React.MouseEvent, tournamentId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to mark this tournament as completed?')) {
      return
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete tournament')
      }

      showToast('Tournament marked as completed', 'success')
      fetchTournaments()
    } catch (error: any) {
      console.error('Error completing tournament:', error)
      showToast('Failed to complete tournament', 'error')
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'round_robin':
        return 'Round Robin'
      case 'double_round_robin':
        return 'Double Round Robin'
      case 'knockout':
        return 'Knockout'
      case 'hybrid':
        return 'Hybrid'
      default:
        return type
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
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournaments</h1>
          <p className="text-gray-600">Manage and view tournaments</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => router.push('/tournaments/create')}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tournaments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-48 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="registration">Registration</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Tournaments Grid */}
      {filteredTournaments.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No tournaments found</p>
            {isAdmin && (
              <Button onClick={() => router.push('/tournaments/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tournament
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {filteredTournaments.map((tournament) => (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
              <Card className="bg-white border-gray-200 hover:border-gray-300 transition-colors cursor-pointer h-full shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-gray-900 pr-3">
                      {tournament.name}
                    </CardTitle>
                    <Badge className={`${getStatusColor(tournament.status)} shrink-0 whitespace-nowrap`}>
                      {tournament.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {tournament.description && (
                    <CardDescription className="text-gray-600 line-clamp-2">
                      {tournament.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>{getTypeLabel(tournament.type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{tournament.teams?.length || 0} Teams</span>
                    </div>
                    {tournament.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {isAdmin && tournament.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full text-green-600 border-green-300 hover:bg-green-50"
                      onClick={(e) => handleCompleteTournament(e, tournament.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
