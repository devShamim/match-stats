'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabaseClient'
import { Match } from '@/types'
import { X, Save, Trophy } from 'lucide-react'
import { useRefresh } from '@/lib/useRefresh'

interface ScoreUpdateModalProps {
  match: Match | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedMatch: Match) => void
}

interface ScoreFormData {
  score_teamA: string
  score_teamB: string
  status: 'scheduled' | 'in_progress' | 'completed'
}

export default function ScoreUpdateModal({ match, isOpen, onClose, onSave }: ScoreUpdateModalProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const { refresh } = useRefresh()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ScoreFormData>({
    score_teamA: '0',
    score_teamB: '0',
    status: 'scheduled'
  })

  // Update form data when match changes
  useEffect(() => {
    if (match) {
      setFormData({
        score_teamA: (match as any).score_teama?.toString() || '0',
        score_teamB: (match as any).score_teamb?.toString() || '0',
        status: match.status
      })
    }
  }, [match])

  const handleInputChange = (field: keyof ScoreFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!match) return

    setLoading(true)

    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/update-match-score', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          matchId: match.id,
          score_teamA: parseInt(formData.score_teamA),
          score_teamB: parseInt(formData.score_teamB),
          status: formData.status
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update match score')
      }

      showToast('Match score updated successfully!', 'success')
      onSave(result.match)
      refresh() // Use aggressive refresh mechanism
      onClose()
    } catch (err: any) {
      console.error('Score update error:', err)
      showToast(err.message || 'Failed to update match score', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !match) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              <CardTitle>Update Match Score</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Update the score and status for this match
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Match Info */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-900">
                {match.type === 'internal' ? 'Internal Match' : match.opponent || 'External Match'}
              </div>
              <div className="text-xs text-gray-600">
                {new Date(match.date).toLocaleDateString()} at {new Date(match.date).toLocaleTimeString()}
              </div>
            </div>

            {/* Score Input */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">Current Score</div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="score_teamA" className="block text-sm font-medium text-gray-700 mb-1">
                    Team A Score
                  </label>
                  <Input
                    id="score_teamA"
                    type="number"
                    min="0"
                    value={formData.score_teamA}
                    onChange={(e) => handleInputChange('score_teamA', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="score_teamB" className="block text-sm font-medium text-gray-700 mb-1">
                    Team B Score
                  </label>
                  <Input
                    id="score_teamB"
                    type="number"
                    min="0"
                    value={formData.score_teamB}
                    onChange={(e) => handleInputChange('score_teamB', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Match Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Score
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
