/**
 * Utility functions for handling points display and season management
 */

/**
 * Format large point numbers for better readability
 * Examples: 1892 -> "1.9K", 12345 -> "12.3K", 1234567 -> "1.2M"
 */
export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return (points / 1000000).toFixed(1) + 'M'
  }
  if (points >= 1000) {
    return (points / 1000).toFixed(1) + 'K'
  }
  return points.toFixed(1)
}

/**
 * Get the current season/year from a date
 * Defaults to calendar year (Jan 1 - Dec 31)
 * Can be modified to use custom season dates (e.g., Aug 1 - Jul 31)
 */
export function getSeasonFromDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()

  // For calendar year seasons (Jan 1 - Dec 31)
  return year.toString()

  // Alternative: For custom season (e.g., Aug 1 - Jul 31)
  // const month = dateObj.getMonth() + 1 // 1-12
  // if (month >= 8) {
  //   return `${year}-${year + 1}`
  // } else {
  //   return `${year - 1}-${year}`
  // }
}

/**
 * Get the current season
 */
export function getCurrentSeason(): string {
  return getSeasonFromDate(new Date())
}

/**
 * Check if a match date is in a specific season
 */
export function isMatchInSeason(matchDate: Date | string, season: string): boolean {
  const matchSeason = getSeasonFromDate(matchDate)
  return matchSeason === season
}

/**
 * Calculate points per match
 */
export function calculatePointsPerMatch(totalPoints: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) return 0
  return Number((totalPoints / matchesPlayed).toFixed(2))
}

/**
 * Get available seasons from match dates
 * Returns array of season strings sorted descending (newest first)
 */
export function getAvailableSeasons(matchDates: (Date | string)[]): string[] {
  const seasons = new Set<string>()
  matchDates.forEach(date => {
    seasons.add(getSeasonFromDate(date))
  })
  return Array.from(seasons).sort((a, b) => b.localeCompare(a))
}
