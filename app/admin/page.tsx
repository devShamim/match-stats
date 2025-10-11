'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PendingApprovalsCard from '@/components/PendingApprovalsCard'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Users, Calendar, Settings, UserCheck, UserX, Trophy, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardData {
  stats: {
    totalPlayers: number
    pendingPlayers: number
    totalMatches: number
    systemStatus: string
  }
  recentPlayers: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
  recentMatches: Array<{
    id: string
    name: string
    type: string
    status: string
    date: string
    createdAt: string
  }>
  recentActivity: Array<{
    type: string
    message: string
    timestamp: string
    status: string
  }>
}

function AdminPageContent() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/admin-dashboard', {
        headers: {
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch admin dashboard data')
      }
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch admin dashboard data')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

    return time.toLocaleDateString()
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'player_registered':
        return 'bg-orange-500'
      case 'player_approved':
        return 'bg-green-500'
      case 'match_created':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading admin dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <Settings className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
        <p className="text-gray-600">Unable to load admin dashboard data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage players, matches, and system settings</p>
        </div>
        <Button
          onClick={fetchAdminData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Approved players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground">
              Matches created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.systemStatus}</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        {/* <div className="lg:col-span-2">
          <PendingApprovalsCard />
        </div> */}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/create-player">
              <Button className="w-full justify-start mb-2">
                <Plus className="h-4 w-4 mr-2" />
                Add New Player
              </Button>
            </Link>
            <Link href="/admin/create-match">
              <Button variant="outline" className="w-full justify-start mb-2">
                <Trophy className="h-4 w-4 mr-2" />
                Create Match
              </Button>
            </Link>
            <Link href="/players">
              <Button variant="outline" className="w-full justify-start mb-2">
                <Users className="h-4 w-4 mr-2" />
                Manage Players
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Matches
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest administrative actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin={true} requireApproved={true}>
      <AdminPageContent />
    </ProtectedRoute>
  )
}
