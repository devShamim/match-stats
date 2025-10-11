'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'
import { Shield, AlertTriangle } from 'lucide-react'

export default function AdminCreationUtility() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const verifySecretKey = (e: React.FormEvent) => {
    e.preventDefault()
    const expectedKey = process.env.NEXT_PUBLIC_ADMIN_CREATION_KEY || 'dev-admin-2024'

    if (secretKey === expectedKey) {
      setShowForm(true)
      setError('')
    } else {
      setError('Invalid secret key. Access denied.')
    }
  }

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          secretKey,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin account')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-600 flex items-center justify-center">
            <Shield className="h-6 w-6 mr-2" />
            Admin Created!
          </CardTitle>
          <CardDescription className="text-center">
            Admin account created successfully
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              You can now log in with the admin credentials.
            </p>
            <Button
              onClick={() => window.location.href = '/auth/login'}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!showForm) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-red-600 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 mr-2" />
            Security Verification
          </CardTitle>
          <CardDescription className="text-center">
            Enter the secret key to access admin creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={verifySecretKey} className="space-y-4">
            <div>
              <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key *
              </label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Enter secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full">
              Verify & Continue
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              This is a protected development utility
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-orange-600 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 mr-2" />
          Create Admin Account
        </CardTitle>
        <CardDescription className="text-center">
          Development utility to create the first admin user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={createAdmin} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Name *
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter admin name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Admin...' : 'Create Admin Account'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            This utility should only be used during development
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
