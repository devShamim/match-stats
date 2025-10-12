import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Custom hook for forcing data refresh across the application
 * This ensures that all cached data is invalidated and fresh data is fetched
 * Includes Vercel-specific cache busting strategies
 */
export function useRefresh() {
  const router = useRouter()

  const refresh = useCallback(() => {
    // Strategy 1: Force Next.js to refresh all cached data
    router.refresh()

    // Strategy 2: Clear all possible caches
    if (typeof window !== 'undefined') {
      // Clear service worker cache if it exists
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        })
      }

      // Strategy 3: Force reload the page as ultimate fallback
      // This ensures Vercel CDN cache is bypassed
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }, [router])

  return { refresh }
}

/**
 * Utility function to add cache-busting parameters to any URL
 * Includes multiple cache-busting strategies for Vercel
 */
export function addCacheBuster(url: string): string {
  const urlObj = new URL(url, window.location.origin)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)

  // Multiple cache-busting parameters
  urlObj.searchParams.set('_cb', timestamp.toString())
  urlObj.searchParams.set('_r', random)
  urlObj.searchParams.set('_t', timestamp.toString())
  urlObj.searchParams.set('v', timestamp.toString())

  return urlObj.toString()
}

/**
 * Utility function to create cache-busting fetch options
 * Includes Vercel-specific headers
 */
export function getCacheBustingOptions(options: RequestInit = {}): RequestInit {
  const timestamp = Date.now()

  return {
    ...options,
    cache: 'no-store',
    headers: {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'If-Modified-Since': new Date(timestamp - 86400000).toUTCString(), // Yesterday
      'X-Cache-Bust': timestamp.toString(),
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
}

/**
 * Force reload the entire page - ultimate cache buster
 * Use this when all other methods fail
 */
export function forceReload() {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
