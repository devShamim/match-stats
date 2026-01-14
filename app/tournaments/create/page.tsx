'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function CreateTournamentPage() {
  const { user } = useUser()
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'round_robin' as 'round_robin' | 'knockout' | 'hybrid' | 'double_round_robin',
    start_date: '',
    end_date: '',
    max_teams: '',
    min_players_per_team: '5',
    max_players_per_team: '6',
    points_per_win: '3',
    points_per_draw: '1',
    points_per_loss: '0'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Tournament name is required', 'error')
      return
    }

    try {
      setLoading(true)
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        showToast('You must be logged in', 'error')
        return
      }

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
          max_teams: formData.max_teams ? parseInt(formData.max_teams) : null,
          min_players_per_team: parseInt(formData.min_players_per_team),
          max_players_per_team: parseInt(formData.max_players_per_team),
          points_per_win: parseInt(formData.points_per_win),
          points_per_draw: parseInt(formData.points_per_draw),
          points_per_loss: parseInt(formData.points_per_loss)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tournament')
      }

      showToast('Tournament created successfully', 'success')
      router.push(`/tournaments/${data.tournament.id}`)
    } catch (error: any) {
      console.error('Error creating tournament:', error)
      showToast(error.message || 'Failed to create tournament', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/tournaments">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tournaments
        </Button>
      </Link>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Create New Tournament</CardTitle>
          <CardDescription className="text-gray-600">Set up a new tournament competition</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-900">Tournament Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 mt-1"
                placeholder="Enter tournament name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-900">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
                placeholder="Tournament description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="type" className="text-gray-900">Tournament Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
              >
                <option value="round_robin">Round Robin (All teams play each other)</option>
                <option value="double_round_robin">Double Round Robin (All teams play each other twice, then final)</option>
                <option value="knockout">Knockout (Single elimination)</option>
                <option value="hybrid">Hybrid (Groups + Knockout)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className="text-gray-900">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date" className="text-gray-900">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="max_teams" className="text-gray-900">Max Teams (Optional)</Label>
              <Input
                id="max_teams"
                type="number"
                value={formData.max_teams}
                onChange={(e) => setFormData({ ...formData, max_teams: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 mt-1"
                placeholder="Leave empty for unlimited"
                min="2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_players_per_team" className="text-gray-900">Min Players/Team</Label>
                <Input
                  id="min_players_per_team"
                  type="number"
                  value={formData.min_players_per_team}
                  onChange={(e) => setFormData({ ...formData, min_players_per_team: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="max_players_per_team" className="text-gray-900">Max Players/Team</Label>
                <Input
                  id="max_players_per_team"
                  type="number"
                  value={formData.max_players_per_team}
                  onChange={(e) => setFormData({ ...formData, max_players_per_team: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="points_per_win" className="text-gray-900">Points per Win</Label>
                <Input
                  id="points_per_win"
                  type="number"
                  value={formData.points_per_win}
                  onChange={(e) => setFormData({ ...formData, points_per_win: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="points_per_draw" className="text-gray-900">Points per Draw</Label>
                <Input
                  id="points_per_draw"
                  type="number"
                  value={formData.points_per_draw}
                  onChange={(e) => setFormData({ ...formData, points_per_draw: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="points_per_loss" className="text-gray-900">Points per Loss</Label>
                <Input
                  id="points_per_loss"
                  type="number"
                  value={formData.points_per_loss}
                  onChange={(e) => setFormData({ ...formData, points_per_loss: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Tournament'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
