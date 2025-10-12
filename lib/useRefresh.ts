import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Custom hook for forcing data refresh across the application
 * This ensures that all cached data is invalidated and fresh data is fetched
 */
export function useRefresh() {
  const router = useRouter()

  const refresh = useCallback(() => {
    // Force Next.js to refresh all cached data
    router.refresh()

    // Additional cache busting by updating the URL with a timestamp
    // This ensures that any remaining cached data is invalidated
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('_refresh', Date.now().toString())

    // Use replaceState to avoid adding to browser history
    window.history.replaceState({}, '', currentUrl.toString())
  }, [router])

  return { refresh }
}

/**
 * Utility function to add cache-busting parameters to any URL
 */
export function addCacheBuster(url: string): string {
  const urlObj = new URL(url, window.location.origin)
  urlObj.searchParams.set('_cb', Date.now().toString())
  return urlObj.toString()
}

/**
 * Utility function to create cache-busting fetch options
 */
export function getCacheBustingOptions(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    cache: 'no-store',
    headers: {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
}
