'use client'

import { useEffect, useRef } from 'react'
import SoccerLineUp from 'react-soccer-lineup'
import Link from 'next/link'

interface Player {
  name: string
  rating: number | null
  playerId: string
  photoUrl?: string | null
  position?: string | null
  jerseyNumber?: number | null
  goals: number
  assists: number
  isSubstituted: boolean
}

interface FieldFormationProps {
  teamAPlayers: Player[] | string[]
  teamBPlayers: Player[] | string[]
  teamAName: string
  teamBName: string
}

// Helper function to determine position category
// This now uses the stored position from match_players.position (set in match edit modal)
const getPositionCategory = (position: string | null | undefined): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | null => {
  if (!position) return null

  const pos = position.toLowerCase().trim()

  // Exact matches first (from match edit modal)
  if (pos === 'goalkeeper') return 'goalkeeper'
  if (pos === 'defender') return 'defender'
  if (pos === 'midfielder') return 'midfielder'
  if (pos === 'forward') return 'forward'

  // Fallback for variations (for backward compatibility)
  if (pos === 'gk' || pos === 'keeper' || pos === 'goalie' ||
      pos.includes('goalkeeper') || pos.includes('goal keeper')) {
    return 'goalkeeper'
  }

  if ((pos === 'def' || pos === 'cb' || pos === 'lb' || pos === 'rb' ||
       pos === 'lcb' || pos === 'rcb' || pos === 'sweeper' || pos.includes('defender') ||
       pos.includes('centre back') || pos.includes('center back') || pos.includes('left back') ||
       pos.includes('right back')) && !pos.includes('mid')) {
    return 'defender'
  }

  if (pos === 'mid' || pos === 'cm' || pos === 'cam' || pos === 'cdm' ||
      pos === 'lm' || pos === 'rm' || pos === 'lcm' || pos === 'rcm' || pos.includes('midfielder') ||
      pos.includes('central mid') || pos.includes('attacking mid') || pos.includes('defensive mid') ||
      pos.includes('left mid') || pos.includes('right mid')) {
    return 'midfielder'
  }

  if (pos === 'fwd' || pos === 'st' || pos === 'striker' || pos === 'cf' ||
      pos === 'lw' || pos === 'rw' || pos === 'lf' || pos === 'rf' || pos.includes('forward') ||
      pos.includes('striker') || pos.includes('winger') || pos.includes('attacker') ||
      pos.includes('left wing') || pos.includes('right wing')) {
    return 'forward'
  }

  return null
}

// Categorize players by position
const categorizePlayers = (players: Player[], playerCount: number) => {
  const categorized = {
    goalkeeper: [] as Player[],
    defenders: [] as Player[],
    midfielders: [] as Player[],
    forwards: [] as Player[]
  }

  // First pass: categorize by explicit position
  players.forEach(player => {
    const category = getPositionCategory(player.position)

    if (category === 'goalkeeper') {
      categorized.goalkeeper.push(player)
    } else if (category === 'defender') {
      categorized.defenders.push(player)
    } else if (category === 'midfielder') {
      categorized.midfielders.push(player)
    } else if (category === 'forward') {
      categorized.forwards.push(player)
    }
  })

  // Get uncategorized players
  const uncategorized = players.filter(p => {
    const category = getPositionCategory(p.position)
    return category === null
  })

  // Priority order for filling positions:
  // 1. Goalkeeper (must have 1)
  // 2. Defenders (must have 2, if only 1 then promote a midfielder)
  // 3. Midfielders (for 6 players, need 2)
  // 4. Forwards (need 2 for 5 players, 1 for 6 players)

  // Fill goalkeeper if missing
  if (categorized.goalkeeper.length === 0) {
    // First try to find one from uncategorized
    if (uncategorized.length > 0) {
      categorized.goalkeeper.push(uncategorized.shift()!)
    }
    // If still none, take from other positions (prefer not to take from forwards)
    else if (categorized.defenders.length > 2) {
      categorized.goalkeeper.push(categorized.defenders.pop()!)
    } else if (categorized.midfielders.length > 2) {
      categorized.goalkeeper.push(categorized.midfielders.pop()!)
    } else if (categorized.forwards.length > 1) {
      categorized.goalkeeper.push(categorized.forwards.pop()!)
    }
  }

  // Fill defenders (need exactly 2)
  while (categorized.defenders.length < 2) {
    if (uncategorized.length > 0) {
      categorized.defenders.push(uncategorized.shift()!)
    }
    // If only 1 defender, promote a midfielder to defender
    else if (categorized.defenders.length === 1 && categorized.midfielders.length > 0) {
      categorized.defenders.push(categorized.midfielders.shift()!)
    }
    // Or take from forwards if we have extra
    else if (categorized.forwards.length > (playerCount === 5 ? 2 : 1)) {
      categorized.defenders.push(categorized.forwards.pop()!)
    }
    // Last resort: take from goalkeeper if we have more than 1 (shouldn't happen)
    else if (categorized.goalkeeper.length > 1) {
      categorized.defenders.push(categorized.goalkeeper.pop()!)
    } else {
      break // Can't fill more defenders
    }
  }

  // For 6 players: fill midfielders (need 2)
  if (playerCount > 5) {
    while (categorized.midfielders.length < 2) {
      if (uncategorized.length > 0) {
        categorized.midfielders.push(uncategorized.shift()!)
      }
      // Take from forwards if we have extra
      else if (categorized.forwards.length > 1) {
        categorized.midfielders.push(categorized.forwards.pop()!)
      } else {
        break
      }
    }
  }

  // Fill forwards
  const forwardsNeeded = playerCount === 5 ? 2 : 1
  while (categorized.forwards.length < forwardsNeeded) {
    if (uncategorized.length > 0) {
      categorized.forwards.push(uncategorized.shift()!)
    } else {
      break
    }
  }

  // Final redistribution: ensure ALL players are included
  // Don't remove players from categories - instead, distribute extras to fill gaps

  // Count total players we have so far
  const totalCategorized = categorized.goalkeeper.length +
                           categorized.defenders.length +
                           categorized.midfielders.length +
                           categorized.forwards.length

  // If we have uncategorized players, distribute them to fill remaining slots
  // Priority: forwards > midfielders > defenders (but don't exceed formation limits)

  const forwardsNeededFinal = playerCount === 5 ? 2 : 1
  const midfieldersNeeded = playerCount > 5 ? 2 : 0
  const defendersNeeded = 2

  // Fill forwards first (most flexible position)
  while (uncategorized.length > 0 && categorized.forwards.length < forwardsNeededFinal) {
    categorized.forwards.push(uncategorized.shift()!)
  }

  // For 6 players: fill midfielders
  if (playerCount > 5) {
    while (uncategorized.length > 0 && categorized.midfielders.length < midfieldersNeeded) {
      categorized.midfielders.push(uncategorized.shift()!)
    }
  }

  // Fill defenders if still needed
  while (uncategorized.length > 0 && categorized.defenders.length < defendersNeeded) {
    categorized.defenders.push(uncategorized.shift()!)
  }

  // If we still have uncategorized players, add them to forwards (even if it exceeds the limit)
  // This ensures ALL players are shown
  while (uncategorized.length > 0) {
    categorized.forwards.push(uncategorized.shift()!)
  }

  // If we have extra players in one category and missing in another, redistribute
  // But only if it doesn't break the formation structure

  // If we have too many defenders and missing midfielders (for 6 players)
  if (playerCount > 5 && categorized.defenders.length > defendersNeeded && categorized.midfielders.length < midfieldersNeeded) {
    const extra = categorized.defenders.splice(defendersNeeded)
    categorized.midfielders.push(...extra.slice(0, midfieldersNeeded - categorized.midfielders.length))
    // Put any remaining back to forwards
    if (extra.length > midfieldersNeeded - categorized.midfielders.length) {
      categorized.forwards.push(...extra.slice(midfieldersNeeded - categorized.midfielders.length))
    }
  }

  // If we have too many forwards and missing midfielders (for 6 players)
  if (playerCount > 5 && categorized.forwards.length > forwardsNeededFinal && categorized.midfielders.length < midfieldersNeeded) {
    const extra = categorized.forwards.splice(forwardsNeededFinal)
    categorized.midfielders.push(...extra.slice(0, midfieldersNeeded - categorized.midfielders.length))
    // Put any remaining back to forwards
    if (extra.length > midfieldersNeeded - categorized.midfielders.length) {
      categorized.forwards.push(...extra.slice(midfieldersNeeded - categorized.midfielders.length))
    }
  }

  return categorized
}

// Convert players to react-soccer-lineup format
const convertToSquadFormat = (
  categorized: ReturnType<typeof categorizePlayers>,
  playerCount: number,
  allPlayers: Player[],
  onPlayerClick: (playerId: string) => void
) => {
  const squad: any = {}

  // Verify all players are accounted for
  const accountedPlayers = new Set<string>()
  categorized.goalkeeper.forEach(p => accountedPlayers.add(p.playerId))
  categorized.defenders.forEach(p => accountedPlayers.add(p.playerId))
  categorized.midfielders.forEach(p => accountedPlayers.add(p.playerId))
  categorized.forwards.forEach(p => accountedPlayers.add(p.playerId))

  // Find any missing players and add them to forwards
  const missingPlayers = allPlayers.filter(p => !accountedPlayers.has(p.playerId))
  if (missingPlayers.length > 0) {
    categorized.forwards.push(...missingPlayers)
  }

  // Goalkeeper - MUST be from goalkeeper category (only 1)
  if (categorized.goalkeeper.length > 0) {
    const gk = categorized.goalkeeper[0] // Always use the first (and should be only) goalkeeper
    squad.gk = {
      number: gk.rating ? gk.rating.toFixed(1) : (gk.jerseyNumber || 1),
      name: gk.name,
      photoUrl: gk.photoUrl,
      rating: gk.rating,
      onClick: () => onPlayerClick(gk.playerId)
    }
  }

  // Defenders - MUST be from defenders category
  // Include ALL defenders, even if it exceeds 2 (to show all players)
  if (categorized.defenders.length > 0) {
    // If only 1 defender and we have midfielders, use a midfielder to fill (already handled in categorization)
    if (categorized.defenders.length === 1 && categorized.midfielders.length > 0) {
      squad.df = [
        {
          number: categorized.defenders[0].rating ? categorized.defenders[0].rating.toFixed(1) : (categorized.defenders[0].jerseyNumber || 2),
          name: categorized.defenders[0].name,
          photoUrl: categorized.defenders[0].photoUrl,
          rating: categorized.defenders[0].rating,
          onClick: () => onPlayerClick(categorized.defenders[0].playerId)
        },
        {
          number: categorized.midfielders[0].rating ? categorized.midfielders[0].rating.toFixed(1) : (categorized.midfielders[0].jerseyNumber || 3),
          name: categorized.midfielders[0].name,
          photoUrl: categorized.midfielders[0].photoUrl,
          rating: categorized.midfielders[0].rating,
          onClick: () => onPlayerClick(categorized.midfielders[0].playerId)
        }
      ]
    } else {
      // Include all defenders (at least 2, but can be more)
      squad.df = categorized.defenders.map((p, idx) => ({
        number: p.rating ? p.rating.toFixed(1) : (p.jerseyNumber || (idx + 2)),
        name: p.name,
        photoUrl: p.photoUrl,
        rating: p.rating,
        onClick: () => onPlayerClick(p.playerId)
      }))
    }
  }

  // For 6 players: add midfielders - MUST be from midfielders category
  // Include ALL midfielders, even if it exceeds 2 (to show all players)
  if (playerCount > 5 && categorized.midfielders.length > 0) {
    // Filter out any midfielders that were used as defenders
    const availableMidfielders = categorized.midfielders.filter(m =>
      !squad.df?.some((d: any) => d.name === m.name)
    )
    if (availableMidfielders.length > 0) {
      squad.cm = availableMidfielders.map((p, idx) => ({
        number: p.rating ? p.rating.toFixed(1) : (p.jerseyNumber || (idx + 6)),
        name: p.name,
        photoUrl: p.photoUrl,
        rating: p.rating,
        onClick: () => onPlayerClick(p.playerId)
      }))
    }
  }

  // Forwards - MUST be from forwards category
  // Include ALL forwards, even if it exceeds the formation limit (to show all players)
  if (categorized.forwards.length > 0) {
    const forwardsNeeded = playerCount === 5 ? 2 : 1
    // Use the required number for formation, but include extras if needed
    const forwardsToShow = categorized.forwards.slice(0, Math.max(forwardsNeeded, categorized.forwards.length))
    squad.fw = forwardsToShow.map((p, idx) => ({
      number: p.rating ? p.rating.toFixed(1) : (p.jerseyNumber || (idx + 9)),
      name: p.name,
      photoUrl: p.photoUrl,
      rating: p.rating,
      onClick: () => onPlayerClick(p.playerId)
    }))
  }

  return squad
}

export default function FieldFormation({ teamAPlayers, teamBPlayers, teamAName, teamBName }: FieldFormationProps) {
  // Filter out string arrays and ensure all required fields have defaults
  const teamAPlayersFiltered = teamAPlayers
    .filter((p): p is Player => typeof p !== 'string')
    .map(p => ({
      ...p,
      photoUrl: p.photoUrl ?? null,
      position: p.position ?? null,
      jerseyNumber: p.jerseyNumber ?? null,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      isSubstituted: p.isSubstituted ?? false
    }))
  const teamBPlayersFiltered = teamBPlayers
    .filter((p): p is Player => typeof p !== 'string')
    .map(p => ({
      ...p,
      photoUrl: p.photoUrl ?? null,
      position: p.position ?? null,
      jerseyNumber: p.jerseyNumber ?? null,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      isSubstituted: p.isSubstituted ?? false
    }))

  if (teamAPlayersFiltered.length === 0 || teamBPlayersFiltered.length === 0) {
    return null
  }

  const teamACount = teamAPlayersFiltered.length
  const teamBCount = teamBPlayersFiltered.length

  const teamACategorized = categorizePlayers(teamAPlayersFiltered, teamACount)
  const teamBCategorized = categorizePlayers(teamBPlayersFiltered, teamBCount)

  // Calculate average ratings
  const teamARatedPlayers = teamAPlayersFiltered.filter(p => p.rating !== null)
  const teamAAvgRating = teamARatedPlayers.length > 0
    ? teamARatedPlayers.reduce((sum, p) => sum + (p.rating || 0), 0) / teamARatedPlayers.length
    : 0

  const teamBRatedPlayers = teamBPlayersFiltered.filter(p => p.rating !== null)
  const teamBAvgRating = teamBRatedPlayers.length > 0
    ? teamBRatedPlayers.reduce((sum, p) => sum + (p.rating || 0), 0) / teamBRatedPlayers.length
    : 0

  // Handle player click - navigate to player profile
  const handlePlayerClick = (playerId: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/player/${playerId}`
    }
  }

  // Convert to squad format
  const teamASquad = convertToSquadFormat(teamACategorized, teamACount, teamAPlayersFiltered, handlePlayerClick)
  const teamBSquad = convertToSquadFormat(teamBCategorized, teamBCount, teamBPlayersFiltered, handlePlayerClick)

  // Ref for the formation container
  const formationRef = useRef<HTMLDivElement>(null)

  // Effect to inject profile pictures and ratings
  useEffect(() => {
    if (!formationRef.current) return

    const updatePlayerElements = () => {
      const allPlayers = [...teamAPlayersFiltered, ...teamBPlayersFiltered]

      // Create a map of player names to player data for quick lookup
      const playerMap = new Map<string, typeof teamAPlayersFiltered[0]>()
      allPlayers.forEach(p => playerMap.set(p.name, p))

      // Try multiple selectors to find player elements
      const selectors = [
        'svg g[class*="player"]',
        'svg g',
        '[class*="react-soccer-lineup"] g',
        '[class*="react-soccer-lineup"] [class*="player"]',
        '[class*="react-soccer-lineup"] circle'
      ]

      let playerElements: NodeListOf<Element> | null = null
      for (const selector of selectors) {
        playerElements = formationRef.current?.querySelectorAll(selector) || null
        if (playerElements && playerElements.length > 0) {
          console.log(`Found ${playerElements.length} elements with selector: ${selector}`)
          break
        }
      }

      if (!playerElements || playerElements.length === 0) {
        console.log('No player elements found')
        return
      }

      console.log(`Processing ${playerElements.length} player elements`)
      console.log('Available players:', Array.from(playerMap.keys()))
      console.log('Team A squad:', teamASquad)
      console.log('Team B squad:', teamBSquad)

      // Create a flat array of all players in order (GK, DF, CM, FW)
      const allSquadPlayers: Array<{ name: string; player: typeof teamAPlayersFiltered[0] }> = []
      if (teamASquad.gk) allSquadPlayers.push({ name: teamASquad.gk.name, player: playerMap.get(teamASquad.gk.name)! })
      if (teamASquad.df) teamASquad.df.forEach((p: any) => allSquadPlayers.push({ name: p.name, player: playerMap.get(p.name)! }))
      if (teamASquad.cm) teamASquad.cm.forEach((p: any) => allSquadPlayers.push({ name: p.name, player: playerMap.get(p.name)! }))
      if (teamASquad.fw) teamASquad.fw.forEach((p: any) => allSquadPlayers.push({ name: p.name, player: playerMap.get(p.name)! }))
      if (teamBSquad.gk) allSquadPlayers.push({ name: teamBSquad.gk.name, player: playerMap.get(teamBSquad.gk.name)! })
      if (teamBSquad.df) teamBSquad.df.forEach((p: any) => allSquadPlayers.push({ name: p.name, player: playerMap.get(p.name)! }))
      if (teamBSquad.cm) teamBSquad.cm.forEach((p: any) => allSquadPlayers.push({ name: p.name, player: playerMap.get(p.name)! }))
      if (teamBSquad.fw) teamBSquad.fw.forEach((p: any) => allSquadPlayers.push({ name: p.name, player: playerMap.get(p.name)! }))

      playerElements.forEach((el, index) => {
        // Try to find player name from various elements
        const textElements = el.querySelectorAll('text, tspan, span')
        let playerName = ''
        let player: typeof teamAPlayersFiltered[0] | undefined

        // First, try to match by text content
        for (const textEl of Array.from(textElements)) {
          const text = textEl.textContent?.trim()
          if (text && playerMap.has(text)) {
            playerName = text
            player = playerMap.get(text)
            break
          }
        }

        // If not found by text, try to match by position in formation (fallback)
        if (!playerName && index < allSquadPlayers.length) {
          const squadPlayer = allSquadPlayers[index]
          if (squadPlayer && squadPlayer.player) {
            playerName = squadPlayer.name
            player = squadPlayer.player
            console.log(`Matched player ${playerName} by position index ${index}`)
          }
        }

        // If still not found, try partial name matching
        if (!playerName) {
          const allText = Array.from(textElements).map(te => te.textContent?.trim()).filter(Boolean).join(' ')
          const matchedPlayer = allPlayers.find(p => {
            const nameParts = p.name.split(' ')
            return nameParts.some(part => allText.includes(part)) || allText.includes(p.name)
          })
          if (matchedPlayer) {
            playerName = matchedPlayer.name
            player = matchedPlayer
          }
        }

        if (!playerName || !player) {
          // Debug: log what we found
          console.log(`Could not find player for element ${index}:`, el, 'Text found:', Array.from(textElements).map(te => te.textContent))
          return
        }

        console.log(`Processing player: ${playerName}, photoUrl: ${player.photoUrl}`)

        // Find the circle element - could be SVG circle or div
        let circle: HTMLElement | SVGCircleElement | null = el.querySelector('circle')
        if (!circle) {
          // Try to find circle in child elements
          const children = el.children
          for (let i = 0; i < children.length; i++) {
            if (children[i].tagName === 'circle') {
              circle = children[i] as SVGCircleElement
              break
            }
          }
        }
        if (!circle) {
          circle = el.querySelector('div[style*="background"], div[class*="circle"], div') as HTMLElement
        }
        if (!circle) {
          console.log(`No circle found for player: ${playerName}`)
          return
        }

        console.log(`Found circle for ${playerName}:`, circle.tagName, circle instanceof SVGCircleElement ? 'SVG' : 'HTML')

        // Set background image if photo exists
        if (player.photoUrl) {
          if (circle instanceof HTMLElement && circle.tagName === 'DIV') {
            // For HTML div elements
            circle.style.backgroundImage = `url(${player.photoUrl})`
            circle.style.backgroundSize = 'cover'
            circle.style.backgroundPosition = 'center'
            circle.style.backgroundColor = 'transparent'
            circle.style.border = '2px solid white'
            circle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
          } else if (circle instanceof SVGCircleElement) {
            // For SVG circles, use a pattern with image
            const svg = circle.closest('svg')
            if (svg) {
              // Get or create defs element
              let defs = svg.querySelector('defs')
              if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
                svg.insertBefore(defs, svg.firstChild)
              }

              const patternId = `pattern-${player.playerId}`

              // Remove existing pattern if any
              const existingPattern = defs.querySelector(`#${patternId}`)
              if (existingPattern) {
                existingPattern.remove()
              }

              // Create new pattern
              const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
              pattern.setAttribute('id', patternId)
              pattern.setAttribute('x', '0')
              pattern.setAttribute('y', '0')
              pattern.setAttribute('width', '1')
              pattern.setAttribute('height', '1')
              pattern.setAttribute('patternUnits', 'objectBoundingBox')

              // Create image element
              const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
              image.setAttribute('href', player.photoUrl)
              image.setAttribute('x', '0')
              image.setAttribute('y', '0')
              image.setAttribute('width', '1')
              image.setAttribute('height', '1')
              image.setAttribute('preserveAspectRatio', 'xMidYMid slice')

              // Handle image load errors
              image.addEventListener('error', () => {
                console.warn(`Failed to load image: ${player.photoUrl}`)
                // Keep the original fill color if image fails
              })

              pattern.appendChild(image)
              defs.appendChild(pattern)

              // Apply pattern to circle
              circle.setAttribute('fill', `url(#${patternId})`)
              circle.setAttribute('stroke', 'white')
              circle.setAttribute('stroke-width', '2')

              console.log(`Applied pattern ${patternId} to circle for ${playerName}`)
            }
          }
        } else {
          console.log(`No photoUrl for player: ${playerName}`)
        }

        // Hide jersey number text if it exists
        const numberText = el.querySelector('text[class*="number"], text')
        if (numberText && player.rating !== null) {
          numberText.setAttribute('opacity', '0')
        }

        // Remove existing rating badge if any
        const existingBadge = el.querySelector('.rating-badge')
        if (existingBadge) {
          existingBadge.remove()
        }

        // Add rating badge if rating exists
        if (player.rating !== null) {
          const ratingColor = player.rating >= 7 ? '#10b981' : player.rating >= 5 ? '#f59e0b' : '#ef4444'

          // Create container for badge if needed
          const container = el.closest('g') || el
          const svg = container.closest('svg')

          if (svg && circle instanceof SVGCircleElement) {
            // For SVG, create a foreignObject for HTML content
            const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
            const circleBounds = circle.getBBox()
            foreignObject.setAttribute('x', String(circleBounds.x + circleBounds.width - 16))
            foreignObject.setAttribute('y', String(circleBounds.y - 8))
            foreignObject.setAttribute('width', '24')
            foreignObject.setAttribute('height', '24')

            const badgeDiv = document.createElement('div')
            badgeDiv.className = 'rating-badge'
            badgeDiv.textContent = player.rating.toFixed(1)
            badgeDiv.style.cssText = `
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: ${ratingColor};
              color: white;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `

            foreignObject.appendChild(badgeDiv)
            container.appendChild(foreignObject)
          } else {
            // For HTML elements
            const ratingBadge = document.createElement('div')
            ratingBadge.className = 'rating-badge'
            ratingBadge.textContent = player.rating.toFixed(1)
            ratingBadge.style.cssText = `
              position: absolute;
              top: -8px;
              right: -8px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: ${ratingColor};
              color: white;
              border: 2px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              z-index: 10;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `

            if (circle instanceof HTMLElement) {
              if (circle.style.position !== 'relative' && circle.style.position !== 'absolute') {
                circle.style.position = 'relative'
              }
              circle.appendChild(ratingBadge)
            }
          }
        }
      })
    }

    // Wait for the library to render, then update
    const timeout = setTimeout(updatePlayerElements, 200)

    // Also try on mutation (when DOM changes)
    const observer = new MutationObserver(updatePlayerElements)
    if (formationRef.current) {
      observer.observe(formationRef.current, { childList: true, subtree: true })
    }

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [teamAPlayersFiltered, teamBPlayersFiltered, teamASquad, teamBSquad])

  return (
    <div className="w-full">
      {/* Team A Average Rating */}
      <div className="mb-2 flex items-center justify-start">
        <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
        <span className="font-semibold text-gray-800">{teamAName}</span>
        {teamAAvgRating > 0 && (
          <div className="ml-3 flex items-center gap-2">
            <div className={`w-3 h-3 ${
              teamAAvgRating >= 7 ? 'bg-green-500' : teamAAvgRating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
            } border border-gray-300`}></div>
            <span className="font-bold text-sm text-gray-800">{teamAAvgRating.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Field Formation using react-soccer-lineup */}
      <div ref={formationRef} className="w-full relative">
        <SoccerLineUp
          size="responsive"
          color="#588f58"
          pattern="lines"
          homeTeam={{
            squad: teamASquad,
            style: {
              color: '#3b82f6',
              numberColor: '#ffffff',
              nameColor: '#ffffff',
            },
          }}
          awayTeam={{
            squad: teamBSquad,
            style: {
              color: '#dc2626',
              numberColor: '#ffffff',
              nameColor: '#ffffff',
            },
          }}
        />
      </div>

      {/* Team B Average Rating */}
      <div className="mt-2 flex items-center justify-end">
        <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
        <span className="font-semibold text-gray-800">{teamBName}</span>
        {teamBAvgRating > 0 && (
          <div className="ml-3 flex items-center gap-2">
            <div className={`w-3 h-3 ${
              teamBAvgRating >= 7 ? 'bg-green-500' : teamBAvgRating >= 5 ? 'bg-yellow-500' : 'bg-red-500'
            } border border-gray-300`}></div>
            <span className="font-bold text-sm text-gray-800">{teamBAvgRating.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
