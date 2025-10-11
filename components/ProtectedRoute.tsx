'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, Clock } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireApproved?: boolean
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireApproved = true
}: ProtectedRouteProps) {
  const { user, userProfile, loading, isAdmin, isApproved, isPending } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (requireApproved && !isApproved) {
        if (isPending) {
          // User is pending approval, show pending message
          return
        } else {
          // User is rejected or has no profile, redirect to login
          router.push('/auth/login')
          return
        }
      }

      if (requireAdmin && !isAdmin) {
        router.push('/dashboard')
        return
      }
    }
  }, [user, userProfile, loading, isAdmin, isApproved, isPending, router, requireAdmin, requireApproved])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (requireApproved && !isApproved) {
    if (isPending) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-orange-600 flex items-center justify-center">
                <Clock className="h-6 w-6 mr-2" />
                Pending Approval
              </CardTitle>
              <CardDescription className="text-center">
                Your account is waiting for admin approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Thank you for registering! Your account is currently under review by our administrators.
                  You'll receive an email notification once your account is approved.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-sm text-orange-800">
                    <strong>What's next?</strong><br />
                    • Wait for admin approval<br />
                    • Check your email for updates<br />
                    • Contact support if needed
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/auth/login')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 mr-2" />
                Access Denied
              </CardTitle>
              <CardDescription className="text-center">
                Your account has been rejected or suspended
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Unfortunately, your account registration has been rejected.
                  Please contact the administrator for more information.
                </p>
                <Button
                  onClick={() => router.push('/auth/login')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-red-600 flex items-center justify-center">
              <Shield className="h-6 w-6 mr-2" />
              Admin Access Required
            </CardTitle>
            <CardDescription className="text-center">
              This page is restricted to administrators only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                You don't have permission to access this page.
                Only administrators can view this content.
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
