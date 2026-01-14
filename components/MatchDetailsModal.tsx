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
  Zap, AlertTriangle, UserCheck, UserX, Shield, Settings,
  Calendar, MapPin, Edit3, Star
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
  team: 'A' | 'B' // Team that gets the goal (opponent team for own goals)
  goal_type?: 'normal' | 'own_goal'
  player_team?: 'A' | 'B' // Team of the player who scored (for own goals)
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

interface Save {
  id?: string
  minute: number
  player: string
  team: 'A' | 'B'
}

interface CleanSheet {
  id?: string
  player: string
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
  saves: Save[]
  clean_sheets: CleanSheet[]
  stats: MatchStats
  match_summary?: string
  teamAPlayers?: string[] | Array<{ name: string; rating: number | null; playerId: string }>
  teamBPlayers?: string[] | Array<{ name: string; rating: number | null; playerId: string }>
  teamAName?: string
  teamBName?: string
}

export default function MatchDetailsModal({ match, isOpen, onClose, onSave }: MatchDetailsModalProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'goals' | 'cards' | 'subs' | 'saves' | 'clean_sheets' | 'stats' | 'ratings' | 'others'>('goals')
  const [playerRatings, setPlayerRatings] = useState<Map<string, number>>(new Map())

  // Helper function to get player name from either string or object format
  const getPlayerName = (player: string | { name: string; rating: number | null; playerId: string }): string => {
    return typeof player === 'string' ? player : player.name
  }

  // Helper function to get player list as array of strings
  const getPlayerNames = (players?: string[] | Array<{ name: string; rating: number | null; playerId: string }>): string[] => {
    if (!players) return []
    return players.map(p => typeof p === 'string' ? p : p.name)
  }

  // State for match info form
  const [matchInfo, setMatchInfo] = useState({
    date: '',
    time: '',
    location: '',
    opponent: '',
    type: 'internal',
    status: 'scheduled',
    score_teamA: 0,
    score_teamB: 0,
    teamA_name: '',
    teamB_name: '',
    match_summary: ''
  })

  // State for team players
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  // For tournament fixtures we want each column to show ONLY that team's roster
  const [teamAPlayerPool, setTeamAPlayerPool] = useState<any[]>([])
  const [teamBPlayerPool, setTeamBPlayerPool] = useState<any[]>([])
  const [selectedTeamAPlayers, setSelectedTeamAPlayers] = useState<string[]>([])
  const [selectedTeamBPlayers, setSelectedTeamBPlayers] = useState<string[]>([])
  const [savingMatchInfo, setSavingMatchInfo] = useState(false)
  const [savingTeamPlayers, setSavingTeamPlayers] = useState(false)

  // Formation and position assignment
  const [formation, setFormation] = useState<'1-2-2' | '1-2-2-1'>('1-2-2')
  const [teamAPositions, setTeamAPositions] = useState<Map<string, string>>(new Map())
  const [teamBPositions, setTeamBPositions] = useState<Map<string, string>>(new Map())

  const [details, setDetails] = useState<MatchDetails>({
    goals: [],
    cards: [],
    substitutions: [],
    saves: [],
    clean_sheets: [],
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

  const normalizeName = (s: unknown) =>
    String(s || '')
      .trim()
      .toLowerCase()

  const loadMatchDetails = async () => {
    if (!match) return

    try {
      // Reset per-match UI state to avoid leaking selection between matches
      setAllPlayers([])
      setTeamAPlayerPool([])
      setTeamBPlayerPool([])
      setSelectedTeamAPlayers([])
      setSelectedTeamBPlayers([])
      setTeamAPositions(new Map())
      setTeamBPositions(new Map())

      // Load match details
      const response = await fetch(`/api/match-details/${match.id}?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()

        if (data.success && data.details) {
          // Merge own goals into goals array for editing
          const normalGoals = (data.details.goals || []).map((g: any) => ({
            ...g,
            goal_type: g.goal_type || 'normal',
            player_team: g.goal_type === 'own_goal' ? (g.player_team || 'A') : undefined
          }))

          const ownGoals = (data.details.own_goals || []).map((og: any) => ({
            id: og.id,
            minute: og.minute,
            scorer: og.player_name,
            assist: undefined,
            team: og.team, // Team that gets the goal (opponent team)
            goal_type: 'own_goal' as const,
            player_team: og.opponent_team // Team of the player who scored OG
          }))

          const allGoals = [...normalGoals, ...ownGoals]

          setDetails(prev => ({
            ...prev,
            ...data.details,
            // Merge normal goals and own goals
            goals: allGoals,
            cards: data.details.cards || [],
            substitutions: data.details.substitutions || [],
            saves: data.details.saves || [],
            clean_sheets: data.details.clean_sheets || [],
            stats: data.details.stats || prev.stats,
            match_summary: data.details.match_summary || '',
            teamAPlayers: data.details.teamAPlayers || [],
            teamBPlayers: data.details.teamBPlayers || [],
            teamAName: data.details.teamAName || 'Team A',
            teamBName: data.details.teamBName || 'Team B'
          }))
        }
      }

      // Load match info for the form
      const matchDate = new Date(match.date)
      const teamAName = (match as any).teamA_name || ''
      const teamBName = (match as any).teamB_name || ''

      setMatchInfo({
        date: matchDate.toISOString().split('T')[0],
        time: matchDate.toTimeString().split(' ')[0].substring(0, 5),
        location: match.location || '',
        opponent: match.opponent || '',
        type: match.type || 'internal',
        status: match.status || 'scheduled',
        score_teamA: (match as any).score_teama || 0,
        score_teamB: (match as any).score_teamb || 0,
        teamA_name: teamAName,
        teamB_name: teamBName,
        match_summary: (match as any).match_summary || ''
      })

      /**
       * Player pools:
       * - For tournament/fixture matches with teamA_name + teamB_name matching persistent teams:
       *   Each column should show ONLY that team's roster, and default-select those players.
       * - For non-tournament matches:
       *   Show all players and rely on saved match assignment (or empty).
       */
      const isTournamentMatch = Boolean((match as any).tournament_id) || Boolean((match as any).is_fixture)

      // Always fetch full player list once (we'll filter into pools)
      let allPlayersFull: any[] = []
      const playersResponse = await fetch('/api/players')
      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        if (playersData.success) allPlayersFull = playersData.players || []
      }

      let teamARosterIds: string[] = []
      let teamBRosterIds: string[] = []

      if (teamAName && teamBName) {
        try {
          const teamsResponse = await fetch('/api/teams')
          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json()

            const teamA = (teamsData.teams || []).find(
              (t: any) => normalizeName(t.name) === normalizeName(teamAName)
            )
            const teamB = (teamsData.teams || []).find(
              (t: any) => normalizeName(t.name) === normalizeName(teamBName)
            )

            teamARosterIds = (teamA?.players || [])
              .map((tp: any) => tp.player_id)
              .filter(Boolean)

            teamBRosterIds = (teamB?.players || [])
              .map((tp: any) => tp.player_id)
              .filter(Boolean)
          }
        } catch (e) {
          console.error('Error loading persistent team rosters:', e)
        }
      }

      // Build per-team pools for display
      const teamASet = new Set(teamARosterIds)
      const teamBSet = new Set(teamBRosterIds)

      const poolA = allPlayersFull.filter((p: any) => teamASet.has(p.id))
      const poolB = allPlayersFull.filter((p: any) => teamBSet.has(p.id))

      // Union for tabs like Ratings (uses selectedTeamAPlayers/selectedTeamBPlayers filtering)
      const unionMap = new Map<string, any>()
      ;[...poolA, ...poolB].forEach((p: any) => unionMap.set(p.id, p))
      const unionPlayers = Array.from(unionMap.values())

      // If no rosters found, fall back to all players for non-tournament matches
      const shouldUseRosters = isTournamentMatch && poolA.length > 0 && poolB.length > 0
      setTeamAPlayerPool(shouldUseRosters ? poolA : allPlayersFull)
      setTeamBPlayerPool(shouldUseRosters ? poolB : allPlayersFull)
      setAllPlayers(shouldUseRosters ? unionPlayers : allPlayersFull)

      // Load current team players and positions
      const teamPlayersResponse = await fetch(`/api/match-details/${match.id}`)
      if (teamPlayersResponse.ok) {
        const teamPlayersData = await teamPlayersResponse.json()
        if (teamPlayersData.success && teamPlayersData.details) {
          // Get player IDs from match details
          const teamAPlayerIds = teamPlayersData.details.teamAPlayerIds || []
          const teamBPlayerIds = teamPlayersData.details.teamBPlayerIds || []

          // For tournament matches: default select team rosters if no saved assignments exist yet
          const savedA = teamAPlayerIds.filter((id: string) => teamASet.has(id))
          const savedB = teamBPlayerIds.filter((id: string) => teamBSet.has(id))

          if (shouldUseRosters) {
            const defaultA = savedA.length > 0 ? savedA : teamARosterIds
            const defaultB = savedB.length > 0 ? savedB : teamBRosterIds

            // Prevent accidental overlap (shouldn't happen, but safe)
            const aChosen = new Set(defaultA)
            const bChosen = defaultB.filter((id: string) => !aChosen.has(id))

            setSelectedTeamAPlayers(defaultA)
            setSelectedTeamBPlayers(bChosen)
          } else {
            // Non-tournament: use saved assignments (or empty)
            setSelectedTeamAPlayers(teamAPlayerIds)
            setSelectedTeamBPlayers(teamBPlayerIds)
          }

          // Load positions from match_players
          const { data: matchPlayers, error: mpError } = await supabase
            .from('match_players')
            .select('player_id, position, team_id')
            .eq('match_id', match.id)

          if (!mpError && matchPlayers) {
            const teams = teamPlayersData.details.teamAPlayerIds ?
              await supabase.from('teams').select('id').eq('match_id', match.id).order('created_at') :
              { data: null }

            if (teams.data && teams.data.length >= 2) {
              const teamAId = teams.data[0].id
              const teamBId = teams.data[1].id

              const teamAPos = new Map<string, string>()
              const teamBPos = new Map<string, string>()

              matchPlayers.forEach((mp: any) => {
                if (mp.position) {
                  if (mp.team_id === teamAId) {
                    teamAPos.set(mp.player_id, mp.position)
                  } else if (mp.team_id === teamBId) {
                    teamBPos.set(mp.player_id, mp.position)
                  }
                }
              })

              setTeamAPositions(teamAPos)
              setTeamBPositions(teamBPos)
            }
          }
        }
      }

      // Load existing ratings
      const { data: matchPlayers, error: matchPlayersError } = await supabase
        .from('match_players')
        .select(`
          player_id,
          stats(rating)
        `)
        .eq('match_id', match.id)

      if (!matchPlayersError && matchPlayers) {
        const ratingsMap = new Map<string, number>()
        matchPlayers.forEach((mp: any) => {
          if (mp.player_id && mp.stats && mp.stats.rating !== null) {
            ratingsMap.set(mp.player_id, mp.stats.rating)
          }
        })
        setPlayerRatings(ratingsMap)
      }
    } catch (error) {
      console.error('Error loading match details:', error)
    }
  }

  const addGoal = () => {
    setDetails(prev => ({
      ...prev,
      goals: [...prev.goals, { minute: 0, scorer: '', team: 'A', goal_type: 'normal', player_team: 'A' }]
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

  const addSave = () => {
    setDetails(prev => ({
      ...prev,
      saves: [...prev.saves, { minute: 0, player: '', team: 'A' }]
    }))
  }

  const updateSave = (index: number, field: keyof Save, value: any) => {
    setDetails(prev => ({
      ...prev,
      saves: prev.saves.map((save, i) =>
        i === index ? { ...save, [field]: value } : save
      )
    }))
  }

  const removeSave = (index: number) => {
    setDetails(prev => ({
      ...prev,
      saves: prev.saves.filter((_, i) => i !== index)
    }))
  }

  const addCleanSheet = () => {
    setDetails(prev => ({
      ...prev,
      clean_sheets: [...prev.clean_sheets, { player: '', team: 'A' }]
    }))
  }

  const updateCleanSheet = (index: number, field: keyof CleanSheet, value: any) => {
    setDetails(prev => ({
      ...prev,
      clean_sheets: prev.clean_sheets.map((cleanSheet, i) =>
        i === index ? { ...cleanSheet, [field]: value } : cleanSheet
      )
    }))
  }

  const removeCleanSheet = (index: number) => {
    setDetails(prev => ({
      ...prev,
      clean_sheets: prev.clean_sheets.filter((_, i) => i !== index)
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

  const handleSaveMatchInfo = async () => {
    if (!match) return

    setSavingMatchInfo(true)
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      // Combine date and time
      const dateTime = new Date(`${matchInfo.date}T${matchInfo.time}`)

      const response = await fetch('/api/update-match-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          matchId: match.id,
          date: dateTime.toISOString(),
          location: matchInfo.location,
          opponent: matchInfo.opponent,
          type: matchInfo.type,
          status: matchInfo.status,
          score_teamA: matchInfo.score_teamA,
          score_teamB: matchInfo.score_teamB,
          teamA_name: matchInfo.teamA_name,
          teamB_name: matchInfo.teamB_name,
          match_summary: matchInfo.match_summary
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update match info')
      }

      showToast('Match information updated successfully!', 'success')
      onSave(result.match)
    } catch (err: any) {
      console.error('Error saving match info:', err)
      showToast(err.message || 'Failed to update match information', 'error')
    } finally {
      setSavingMatchInfo(false)
    }
  }

  const handleSaveTeamPlayers = async () => {
    if (!match) return

    setSavingTeamPlayers(true)
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      // Convert position maps to arrays of {playerId, position}
      const teamAPositionsArray = Array.from(teamAPositions.entries()).map(([playerId, position]) => ({
        playerId,
        position
      }))
      const teamBPositionsArray = Array.from(teamBPositions.entries()).map(([playerId, position]) => ({
        playerId,
        position
      }))

      const response = await fetch('/api/update-team-players', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          matchId: match.id,
          teamA_players: selectedTeamAPlayers,
          teamB_players: selectedTeamBPlayers,
          teamA_positions: teamAPositionsArray,
          teamB_positions: teamBPositionsArray,
          formation: formation
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update team players')
      }

      showToast('Team players and positions updated successfully!', 'success')
      onSave(result.match)
    } catch (err: any) {
      console.error('Error saving team players:', err)
      showToast(err.message || 'Failed to update team players', 'error')
    } finally {
      setSavingTeamPlayers(false)
    }
  }

  const handleSaveRatings = async () => {
    if (!match) return

    try {
      // Get all match_players for this match
      const { data: matchPlayers, error: matchPlayersError } = await supabase
        .from('match_players')
        .select('id, player_id')
        .eq('match_id', match.id)

      if (matchPlayersError) {
        throw new Error('Failed to fetch match players')
      }

      // Update ratings for each player
      for (const mp of matchPlayers || []) {
        const rating = playerRatings.get(mp.player_id)

        // Get or create stats record
        const { data: existingStats, error: statsError } = await supabase
          .from('stats')
          .select('id')
          .eq('match_player_id', mp.id)
          .single()

        if (statsError && statsError.code !== 'PGRST116') {
          console.error('Error fetching stats:', statsError)
          continue
        }

        if (existingStats) {
          // Update existing stats
          const { error: updateError } = await supabase
            .from('stats')
            .update({ rating: rating || null })
            .eq('id', existingStats.id)

          if (updateError) {
            console.error('Error updating rating:', updateError)
          }
        } else {
          // Create new stats record with rating
          const { error: insertError } = await supabase
            .from('stats')
            .insert({
              match_player_id: mp.id,
              goals: 0,
              assists: 0,
              yellow_cards: 0,
              red_cards: 0,
              minutes_played: 0,
              own_goals: 0,
              rating: rating || null
            })

          if (insertError) {
            console.error('Error inserting rating:', insertError)
          }
        }
      }

      showToast('Player ratings saved successfully!', 'success')
      // Reload match details to refresh ratings
      loadMatchDetails()
    } catch (err: any) {
      console.error('Error saving ratings:', err)
      showToast(err.message || 'Failed to save ratings', 'error')
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
              { id: 'saves', label: 'Saves', icon: Shield },
              { id: 'clean_sheets', label: 'Clean Sheets', icon: Shield },
              { id: 'stats', label: 'Statistics', icon: Zap },
              { id: 'ratings', label: 'Ratings', icon: Star },
              { id: 'others', label: 'Others', icon: Settings }
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

              {details.goals.map((goal, index) => {
                const isOwnGoal = goal.goal_type === 'own_goal'
                const playerTeam = isOwnGoal ? (goal.player_team || 'A') : goal.team
                return (
                  <Card key={index} className={`p-4 ${isOwnGoal ? 'border-orange-300 bg-orange-50' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
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
                      {isOwnGoal && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Player Team
                          </label>
                          <select
                            value={playerTeam}
                            onChange={(e) => {
                              updateGoal(index, 'player_team', e.target.value)
                              // Clear scorer when team changes
                              updateGoal(index, 'scorer', '')
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="A">{details.teamAName || 'Team A'}</option>
                            <option value="B">{details.teamBName || 'Team B'}</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {isOwnGoal ? 'Player (OG)' : 'Scorer'}
                        </label>
                        <select
                          value={goal.scorer}
                          onChange={(e) => updateGoal(index, 'scorer', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select {isOwnGoal ? 'player' : 'scorer'}</option>
                          {/* For own goal, show players from the selected player team */}
                          {isOwnGoal
                            ? (playerTeam === 'A'
                                ? getPlayerNames(details.teamAPlayers).map(player => (
                                    <option key={player} value={player}>{player}</option>
                                  ))
                                : getPlayerNames(details.teamBPlayers).map(player => (
                                    <option key={player} value={player}>{player}</option>
                                  ))
                              )
                            : (goal.team === 'A'
                                ? getPlayerNames(details.teamAPlayers).map(player => (
                                    <option key={player} value={player}>{player}</option>
                                  ))
                                : getPlayerNames(details.teamBPlayers).map(player => (
                                    <option key={player} value={player}>{player}</option>
                                  ))
                              )
                          }
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {isOwnGoal ? 'Opponent Team (Gets Goal)' : 'Team'}
                        </label>
                        <select
                          value={goal.team}
                          onChange={(e) => updateGoal(index, 'team', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="A">{details.teamAName || 'Team A'}</option>
                          <option value="B">{details.teamBName || 'Team B'}</option>
                        </select>
                        {isOwnGoal && (
                          <p className="text-xs text-orange-600 mt-1">
                            Goal credited to {goal.team === 'A' ? (details.teamAName || 'Team A') : (details.teamBName || 'Team B')}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assist
                        </label>
                        <select
                          value={goal.assist || ''}
                          onChange={(e) => updateGoal(index, 'assist', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={isOwnGoal}
                        >
                          <option value="">Select assist provider</option>
                          {goal.team === 'A'
                            ? getPlayerNames(details.teamAPlayers).map(player => (
                                <option key={player} value={player}>{player}</option>
                              ))
                            : getPlayerNames(details.teamBPlayers).map(player => (
                                <option key={player} value={player}>{player}</option>
                              ))
                          }
                        </select>
                        {isOwnGoal && (
                          <p className="text-xs text-gray-500 mt-1">N/A for own goals</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Goal Type
                        </label>
                        <select
                          value={goal.goal_type || 'normal'}
                          onChange={(e) => {
                            const newType = e.target.value as 'normal' | 'own_goal'
                            updateGoal(index, 'goal_type', newType)
                            // If switching to own goal, clear assist
                            if (newType === 'own_goal') {
                              updateGoal(index, 'assist', '')
                              // Set default player team if not set
                              if (!goal.player_team) {
                                updateGoal(index, 'player_team', goal.team)
                              }
                            }
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="normal">Normal Goal</option>
                          <option value="own_goal">Own Goal</option>
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
                )
              })}

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
                          ? getPlayerNames(details.teamAPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : getPlayerNames(details.teamBPlayers).map(player => (
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
                          ? getPlayerNames(details.teamAPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : getPlayerNames(details.teamBPlayers).map(player => (
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
                          ? getPlayerNames(details.teamAPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : getPlayerNames(details.teamBPlayers).map(player => (
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

          {/* Saves Tab */}
          {activeTab === 'saves' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Saves</h3>
                <Button onClick={addSave} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Save
                </Button>
              </div>

              {details.saves.map((save, index) => (
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
                        value={save.minute}
                        onChange={(e) => updateSave(index, 'minute', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team
                      </label>
                      <select
                        value={save.team}
                        onChange={(e) => updateSave(index, 'team', e.target.value)}
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
                        value={save.player}
                        onChange={(e) => updateSave(index, 'player', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select player</option>
                        {save.team === 'A'
                          ? getPlayerNames(details.teamAPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : getPlayerNames(details.teamBPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSave(index)}
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

          {/* Clean Sheets Tab */}
          {activeTab === 'clean_sheets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Clean Sheets</h3>
                <Button onClick={addCleanSheet} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Clean Sheet
                </Button>
              </div>

              {details.clean_sheets.map((cleanSheet, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team
                      </label>
                      <select
                        value={cleanSheet.team}
                        onChange={(e) => updateCleanSheet(index, 'team', e.target.value)}
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
                        value={cleanSheet.player}
                        onChange={(e) => updateCleanSheet(index, 'player', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select player</option>
                        {cleanSheet.team === 'A'
                          ? getPlayerNames(details.teamAPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                          : getPlayerNames(details.teamBPlayers).map(player => (
                              <option key={player} value={player}>{player}</option>
                            ))
                        }
                      </select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCleanSheet(index)}
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

          {/* Ratings Tab */}
          {activeTab === 'ratings' && (
            <div className="space-y-6">
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Player Ratings
                  </CardTitle>
                  <CardDescription>
                    Rate each player's performance out of 10
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A Players Ratings */}
                    <div>
                      <h4 className="font-medium mb-3 text-blue-600">{matchInfo.teamA_name || 'Team A'}</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-4">
                        {allPlayers
                          .filter(player => selectedTeamAPlayers.includes(player.id))
                          .map(player => (
                            <div key={player.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 flex-1">
                                {player.user_profile?.name || 'Unknown Player'}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={playerRatings.get(player.id) || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? parseFloat(e.target.value) : 0
                                  if (value >= 0 && value <= 10) {
                                    setPlayerRatings(prev => {
                                      const newMap = new Map(prev)
                                      if (value > 0) {
                                        newMap.set(player.id, value)
                                      } else {
                                        newMap.delete(player.id)
                                      }
                                      return newMap
                                    })
                                  }
                                }}
                                placeholder="0-10"
                                className="w-20 ml-2"
                              />
                            </div>
                          ))}
                        {allPlayers.filter(player => selectedTeamAPlayers.includes(player.id)).length === 0 && (
                          <div className="text-gray-500 text-sm italic text-center py-4">
                            No players assigned to Team A
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team B Players Ratings */}
                    <div>
                      <h4 className="font-medium mb-3 text-red-600">{matchInfo.teamB_name || 'Team B'}</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-4">
                        {allPlayers
                          .filter(player => selectedTeamBPlayers.includes(player.id))
                          .map(player => (
                            <div key={player.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 flex-1">
                                {player.user_profile?.name || 'Unknown Player'}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={playerRatings.get(player.id) || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? parseFloat(e.target.value) : 0
                                  if (value >= 0 && value <= 10) {
                                    setPlayerRatings(prev => {
                                      const newMap = new Map(prev)
                                      if (value > 0) {
                                        newMap.set(player.id, value)
                                      } else {
                                        newMap.delete(player.id)
                                      }
                                      return newMap
                                    })
                                  }
                                }}
                                placeholder="0-10"
                                className="w-20 ml-2"
                              />
                            </div>
                          ))}
                        {allPlayers.filter(player => selectedTeamBPlayers.includes(player.id)).length === 0 && (
                          <div className="text-gray-500 text-sm italic text-center py-4">
                            No players assigned to Team B
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleSaveRatings}
                      className="min-w-[120px]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Ratings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Others Tab */}
          {activeTab === 'others' && (
            <div className="space-y-6">
              {/* Match Information */}
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit3 className="h-5 w-5 mr-2" />
                    Match Information
                  </CardTitle>
                  <CardDescription>
                    Update basic match details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <Input
                        type="date"
                        value={matchInfo.date}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time
                      </label>
                      <Input
                        type="time"
                        value={matchInfo.time}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <Input
                        type="text"
                        value={matchInfo.location}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Match location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opponent
                      </label>
                      <Input
                        type="text"
                        value={matchInfo.opponent}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, opponent: e.target.value }))}
                        placeholder="Opponent team name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Match Type
                      </label>
                      <select
                        value={matchInfo.type}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, type: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={matchInfo.status}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, status: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team A Score
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={matchInfo.score_teamA}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, score_teamA: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team B Score
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={matchInfo.score_teamB}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, score_teamB: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team A Name
                      </label>
                      <Input
                        type="text"
                        value={matchInfo.teamA_name}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, teamA_name: e.target.value }))}
                        placeholder="Team A name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team B Name
                      </label>
                      <Input
                        type="text"
                        value={matchInfo.teamB_name}
                        onChange={(e) => setMatchInfo(prev => ({ ...prev, teamB_name: e.target.value }))}
                        placeholder="Team B name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Match Summary
                    </label>
                    <textarea
                      value={matchInfo.match_summary}
                      onChange={(e) => setMatchInfo(prev => ({ ...prev, match_summary: e.target.value }))}
                      placeholder="Write a brief summary of the match..."
                      className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveMatchInfo}
                      disabled={savingMatchInfo}
                      className="min-w-[120px]"
                    >
                      {savingMatchInfo ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Info
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Team Players */}
              <Card className="p-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team Players & Formation
                  </CardTitle>
                  <CardDescription>
                    Assign players to teams and set their positions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Formation Selector */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Formation:</label>
                    <select
                      value={formation}
                      onChange={(e) => {
                        const newFormation = e.target.value as '1-2-2' | '1-2-2-1'
                        setFormation(newFormation)
                        // Clear positions when formation changes
                        setTeamAPositions(new Map())
                        setTeamBPositions(new Map())
                      }}
                      className="px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="1-2-2">1-2-2 (5 players)</option>
                      <option value="1-2-2-1">1-2-2-1 (6 players)</option>
                    </select>
                    <span className="text-xs text-gray-500">
                      {formation === '1-2-2' ? '1 GK, 2 DEF, 2 FWD' : '1 GK, 2 DEF, 2 MID, 1 FWD'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A Players */}
                    <div>
                      <h4 className="font-medium mb-3">{matchInfo.teamA_name || 'Team A'}</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                        {teamAPlayerPool.map(player => (
                          <div key={player.id} className="space-y-1">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedTeamAPlayers.includes(player.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeamAPlayers(prev => [...prev, player.id])
                                  } else {
                                    setSelectedTeamAPlayers(prev => prev.filter(id => id !== player.id))
                                    // Remove position when player is deselected
                                    setTeamAPositions(prev => {
                                      const newMap = new Map(prev)
                                      newMap.delete(player.id)
                                      return newMap
                                    })
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{player.user_profile?.name || 'Unknown Player'}</span>
                            </label>
                            {selectedTeamAPlayers.includes(player.id) && (
                              <select
                                value={teamAPositions.get(player.id) || ''}
                                onChange={(e) => {
                                  setTeamAPositions(prev => {
                                    const newMap = new Map(prev)
                                    if (e.target.value) {
                                      newMap.set(player.id, e.target.value)
                                    } else {
                                      newMap.delete(player.id)
                                    }
                                    return newMap
                                  })
                                }}
                                className="ml-6 w-full px-2 py-1 text-xs border rounded-md"
                              >
                                <option value="">Select position...</option>
                                <option value="Goalkeeper">Goalkeeper</option>
                                <option value="Defender">Defender</option>
                                {formation === '1-2-2-1' && <option value="Midfielder">Midfielder</option>}
                                <option value="Forward">Forward</option>
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team B Players */}
                    <div>
                      <h4 className="font-medium mb-3">{matchInfo.teamB_name || 'Team B'}</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                        {teamBPlayerPool.map(player => (
                          <div key={player.id} className="space-y-1">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedTeamBPlayers.includes(player.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeamBPlayers(prev => [...prev, player.id])
                                  } else {
                                    setSelectedTeamBPlayers(prev => prev.filter(id => id !== player.id))
                                    // Remove position when player is deselected
                                    setTeamBPositions(prev => {
                                      const newMap = new Map(prev)
                                      newMap.delete(player.id)
                                      return newMap
                                    })
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{player.user_profile?.name || 'Unknown Player'}</span>
                            </label>
                            {selectedTeamBPlayers.includes(player.id) && (
                              <select
                                value={teamBPositions.get(player.id) || ''}
                                onChange={(e) => {
                                  setTeamBPositions(prev => {
                                    const newMap = new Map(prev)
                                    if (e.target.value) {
                                      newMap.set(player.id, e.target.value)
                                    } else {
                                      newMap.delete(player.id)
                                    }
                                    return newMap
                                  })
                                }}
                                className="ml-6 w-full px-2 py-1 text-xs border rounded-md"
                              >
                                <option value="">Select position...</option>
                                <option value="Goalkeeper">Goalkeeper</option>
                                <option value="Defender">Defender</option>
                                {formation === '1-2-2-1' && <option value="Midfielder">Midfielder</option>}
                                <option value="Forward">Forward</option>
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveTeamPlayers}
                      disabled={savingTeamPlayers}
                      className="min-w-[120px]"
                    >
                      {savingTeamPlayers ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Players
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
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
