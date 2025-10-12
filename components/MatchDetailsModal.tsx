'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabaseClient'
import { Match } from '@/types'
import {
  X, Save, Plus, Minus, Clock, Trophy, Users, Target,
  Zap, AlertTriangle, UserCheck, UserX, Shield
} from 'lucide-react'

interface MatchDetailsModalProps {
  match: Match | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedMatch: Match) => void
}

interface Goal {
  id?: string
  minute: number
  scorer: string
  assist?: string
  team: 'A' | 'B'
}

interface Card {
  id?: string
  minute: number
  player: string
  type: 'yellow' | 'red'
  team: 'A' | 'B'
}

interface Substitution {
  id?: string
  minute: number
  playerOut: string
  playerIn: string
  team: 'A' | 'B'
}

interface MatchStats {
  possession_teamA: number
  possession_teamB: number
  shots_teamA: number
  shots_teamB: number
  shots_on_target_teamA: number
  shots_on_target_teamB: number
  fouls_teamA: number
  fouls_teamB: number
}

interface MatchDetails {
  goals: Goal[]
  cards: Card[]
  substitutions: Substitution[]
  stats: MatchStats
  match_summary?: string
  teamAPlayers?: string[]
  teamBPlayers?: string[]
  teamAName?: string
  teamBName?: string
}

export default function MatchDetailsModal({ match, isOpen, onClose, onSave }: MatchDetailsModalProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'goals' | 'cards' | 'subs' | 'stats'>('goals')

  const [details, setDetails] = useState<MatchDetails>({
    goals: [],
    cards: [],
    substitutions: [],
    stats: {
      possession_teamA: 50,
      possession_teamB: 50,
      shots_teamA: 0,
      shots_teamB: 0,
      shots_on_target_teamA: 0,
      shots_on_target_teamB: 0,
      fouls_teamA: 0,
      fouls_teamB: 0
    },
    match_summary: '',
    teamAPlayers: [],
    teamBPlayers: [],
    teamAName: 'Team A',
    teamBName: 'Team B'
  })

  // Load match details when modal opens
  useEffect(() => {
    if (match && isOpen) {
      loadMatchDetails()
    }
  }, [match, isOpen])

  const loadMatchDetails = async () => {
    if (!match) return

    try {
      const response = await fetch(`/api/match-details/${match.id}?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()

        if (data.success && data.details) {
          setDetails(prev => ({
            ...prev,
            ...data.details,
            // Ensure we have default values if some are missing
            goals: data.details.goals || [],
            cards: data.details.cards || [],
            substitutions: data.details.substitutions || [],
            stats: data.details.stats || prev.stats,
            match_summary: data.details.match_summary || '',
            teamAPlayers: data.details.teamAPlayers || [],
            teamBPlayers: data.details.teamBPlayers || [],
            teamAName: data.details.teamAName || 'Team A',
            teamBName: data.details.teamBName || 'Team B'
          }))
        }
      }
    } catch (error) {
      console.error('Error loading match details:', error)
    }
  }

  const addGoal = () => {
    setDetails(prev => ({
      ...prev,
      goals: [...prev.goals, { minute: 0, scorer: '', team: 'A' }]
    }))
  }

  const updateGoal = (index: number, field: keyof Goal, value: any) => {
    setDetails(prev => ({
      ...prev,
      goals: prev.goals.map((goal, i) =>
        i === index ? { ...goal, [field]: value } : goal
      )
    }))
  }

  const removeGoal = (index: number) => {
    setDetails(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }))
  }

  const addCard = () => {
    setDetails(prev => ({
      ...prev,
      cards: [...prev.cards, { minute: 0, player: '', type: 'yellow', team: 'A' }]
    }))
  }

  const updateCard = (index: number, field: keyof Card, value: any) => {
    setDetails(prev => ({
      ...prev,
      cards: prev.cards.map((card, i) =>
        i === index ? { ...card, [field]: value } : card
      )
    }))
  }

  const removeCard = (index: number) => {
    setDetails(prev => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index)
    }))
  }

  const addSubstitution = () => {
    setDetails(prev => ({
      ...prev,
      substitutions: [...prev.substitutions, { minute: 0, playerOut: '', playerIn: '', team: 'A' }]
    }))
  }

  const updateSubstitution = (index: number, field: keyof Substitution, value: any) => {
    setDetails(prev => ({
      ...prev,
      substitutions: prev.substitutions.map((sub, i) =>
        i === index ? { ...sub, [field]: value } : sub
      )
    }))
  }

  const removeSubstitution = (index: number) => {
    setDetails(prev => ({
      ...prev,
      substitutions: prev.substitutions.filter((_, i) => i !== index)
    }))
  }

  const updateStats = (field: keyof MatchStats, value: number) => {
    setDetails(prev => ({
      ...prev,
      stats: { ...prev.stats, [field]: value }
    }))
  }

  const handleSave = async () => {
    if (!match) return

    setLoading(true)
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/update-match-details', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          matchId: match.id,
          details
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update match details')
      }

      showToast('Match details updated successfully!', 'success')
      onSave(result.match)
      onClose()
    } catch (err: any) {
      console.error('Match details update error:', err)
      showToast(err.message || 'Failed to update match details', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !match) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Match Details - {match.type === 'internal' ? 'Internal Match' : match.opponent || 'External Match'}
              </CardTitle>
              <CardDescription>
                {new Date(match.date).toLocaleDateString()} at {new Date(match.date).toLocaleTimeString()}
              </CardDescription>
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
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b">
            {[
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'cards', label: 'Cards', icon: AlertTriangle },
              { id: 'subs', label: 'Substitutions', icon: Users },
              { id: 'stats', label: 'Statistics', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </div>

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Goals</h3>
                <Button onClick={addGoal} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </div>

              {details.goals.map((goal, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minute
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={goal.minute}
                        onChange={(e) => updateGoal(index, 'minute', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team
                      </label>
                      <select
                        value={goal.team}
                        onChange={(e) => updateGoal(index, 'team', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="A">{details.teamAName || 'Team A'}</option>
                        <option value="B">{details.teamBName || 'Team B'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scorer
                      </label>
                      <select
                        value={goal.scorer}
                        onChange={(e) => updateGoal(index, 'scorer', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select scorer</option>
                        {goal.team === 'A'
                          ? details.teamAPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : details.teamBPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assist
                      </label>
                      <select
                        value={goal.assist || ''}
                        onChange={(e) => updateGoal(index, 'assist', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select assist provider</option>
                        {goal.team === 'A'
                          ? details.teamAPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : details.teamBPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeGoal(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

            </div>
          )}

          {/* Cards Tab */}
          {activeTab === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cards</h3>
                <Button onClick={addCard} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>

              {details.cards.map((card, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minute
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={card.minute}
                        onChange={(e) => updateCard(index, 'minute', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team
                      </label>
                      <select
                        value={card.team}
                        onChange={(e) => updateCard(index, 'team', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="A">{details.teamAName || 'Team A'}</option>
                        <option value="B">{details.teamBName || 'Team B'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Player
                      </label>
                      <select
                        value={card.player}
                        onChange={(e) => updateCard(index, 'player', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select player</option>
                        {card.team === 'A'
                          ? details.teamAPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : details.teamBPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={card.type}
                          onChange={(e) => updateCard(index, 'type', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="yellow">Yellow</option>
                          <option value="red">Red</option>
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCard(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Substitutions Tab */}
          {activeTab === 'subs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Substitutions</h3>
                <Button onClick={addSubstitution} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Substitution
                </Button>
              </div>

              {details.substitutions.map((sub, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minute
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={sub.minute}
                        onChange={(e) => updateSubstitution(index, 'minute', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team
                      </label>
                      <select
                        value={sub.team}
                        onChange={(e) => updateSubstitution(index, 'team', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="A">{details.teamAName || 'Team A'}</option>
                        <option value="B">{details.teamBName || 'Team B'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Player Out
                      </label>
                      <select
                        value={sub.playerOut}
                        onChange={(e) => updateSubstitution(index, 'playerOut', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select player out</option>
                        {sub.team === 'A'
                          ? details.teamAPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : details.teamBPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Player In
                      </label>
                      <select
                        value={sub.playerIn}
                        onChange={(e) => updateSubstitution(index, 'playerIn', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select player in</option>
                        {sub.team === 'A'
                          ? details.teamAPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : details.teamBPlayers?.map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSubstitution(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Match Statistics</h3>

              {/* Possession */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Possession %</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamAName || 'Team A'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={details.stats.possession_teamA}
                      onChange={(e) => updateStats('possession_teamA', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamBName || 'Team B'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={details.stats.possession_teamB}
                      onChange={(e) => updateStats('possession_teamB', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </Card>

              {/* Shots */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Total Shots</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamAName || 'Team A'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={details.stats.shots_teamA}
                      onChange={(e) => updateStats('shots_teamA', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamBName || 'Team B'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={details.stats.shots_teamB}
                      onChange={(e) => updateStats('shots_teamB', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </Card>

              {/* Shots on Target */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Shots on Target</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamAName || 'Team A'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={details.stats.shots_on_target_teamA}
                      onChange={(e) => updateStats('shots_on_target_teamA', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamBName || 'Team B'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={details.stats.shots_on_target_teamB}
                      onChange={(e) => updateStats('shots_on_target_teamB', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </Card>

              {/* Fouls */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Fouls</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamAName || 'Team A'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={details.stats.fouls_teamA}
                      onChange={(e) => updateStats('fouls_teamA', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {details.teamBName || 'Team B'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={details.stats.fouls_teamB}
                      onChange={(e) => updateStats('fouls_teamB', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </Card>

              {/* Match Summary */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Match Summary</h4>
                <textarea
                  value={details.match_summary || ''}
                  onChange={(e) => setDetails(prev => ({ ...prev, match_summary: e.target.value }))}
                  placeholder="Write a brief summary of the match..."
                  className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Details
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
