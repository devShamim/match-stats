'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/context/UserContext'
import { getPendingUsers, approveUser, rejectUser } from '@/lib/api'
import { UserProfile } from '@/types'
import { Check, X, Clock, User, Mail, Phone, MapPin } from 'lucide-react'

export default function PendingApprovalsCard() {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const { user, refreshUserProfile } = useUser()

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const fetchPendingUsers = async () => {
    try {
      const users = await getPendingUsers()
      setPendingUsers(users)
    } catch (error) {
      console.error('Error fetching pending users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!user) return

    setProcessing(userId)
    try {
      await approveUser(userId, user.id)
      await fetchPendingUsers()
      await refreshUserProfile()
    } catch (error) {
      console.error('Error approving user:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (userId: string) => {
    if (!user) return

    setProcessing(userId)
    try {
      await rejectUser(userId, user.id)
      await fetchPendingUsers()
    } catch (error) {
      console.error('Error rejecting user:', error)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Loading pending user registrations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Pending Approvals
        </CardTitle>
        <CardDescription>
          {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} waiting for approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No pending approvals</p>
            <p className="text-sm text-gray-400">All users have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((userProfile) => (
              <div key={userProfile.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <h3 className="font-medium text-gray-900">{userProfile.name}</h3>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Pending
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-3 w-3" />
                        <span>{userProfile.email}</span>
                      </div>

                      {userProfile.position && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>Position: {userProfile.position}</span>
                        </div>
                      )}

                      {userProfile.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3" />
                          <span>{userProfile.phone}</span>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-2">
                        Registered: {new Date(userProfile.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(userProfile.id)}
                      disabled={processing === userProfile.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(userProfile.id)}
                      disabled={processing === userProfile.id}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
