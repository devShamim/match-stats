'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabaseClient'
import ImageUpload from '@/components/ImageUpload'
import { UserPlus, Mail, Phone, MapPin } from 'lucide-react'
import { useRefresh } from '@/lib/useRefresh'

const POSITIONS = [
  'Goalkeeper',
  'Defender',
  'Midfielder',
  'Forward',
  'Winger',
  'Striker'
]

interface PlayerFormData {
  name: string
  email: string
  position: string
  phone: string
  jersey_number: string
  preferred_position: string
  photo_url: string
}

export default function PlayerCreationForm() {
  const { showToast } = useToast()
  const router = useRouter()
  const { refresh } = useRefresh()
  const [formData, setFormData] = useState<PlayerFormData>({
    name: '',
    email: '',
    position: '',
    phone: '',
    jersey_number: '',
    preferred_position: '',
    photo_url: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: keyof PlayerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, photo_url: imageUrl }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required')
      setLoading(false)
      return
    }

    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      // Call the server-side API route to create the player
      const response = await fetch('/api/create-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          position: formData.position || null,
          phone: formData.phone || null,
          jersey_number: formData.jersey_number || null,
          preferred_position: formData.preferred_position || null,
          photo_url: formData.photo_url || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create player')
      }

      setSuccess(true)
      showToast(`Player ${formData.name} created successfully!`, 'success')
      refresh() // Use aggressive refresh mechanism
    } catch (err: any) {
      console.error('Player creation error:', err)
      const errorMessage = err.message || 'Failed to create player. Please try again.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-600 flex items-center justify-center">
            <UserPlus className="h-6 w-6 mr-2" />
            Player Created Successfully!
          </CardTitle>
          <CardDescription className="text-center">
            The player has been added to the system and is ready to participate in matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Player Details:</p>
              <p className="font-medium">{formData.name}</p>
              <p className="text-sm text-gray-500">{formData.email}</p>
              {formData.position && <p className="text-sm text-gray-500">{formData.position}</p>}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setSuccess(false)
                  setFormData({
                    name: '',
                    email: '',
                    position: '',
                    phone: '',
                    jersey_number: '',
                    preferred_position: '',
                    photo_url: ''
                  })
                }}
                variant="outline"
                className="flex-1"
              >
                Add Another Player
              </Button>
              <Button
                onClick={() => window.location.href = '/admin'}
                className="flex-1"
              >
                Back to Admin Panel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Add New Player</CardTitle>
        <CardDescription className="text-center">
          Create a new player account directly in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter player's full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter player's email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Position
              </label>
              <select
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select position (optional)</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-700 mb-1">
                Jersey Number
              </label>
              <Input
                id="jersey_number"
                type="number"
                placeholder="Enter jersey number"
                value={formData.jersey_number}
                onChange={(e) => handleInputChange('jersey_number', e.target.value)}
                min="1"
                max="99"
              />
            </div>

            <div>
              <label htmlFor="preferred_position" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Position
              </label>
              <select
                id="preferred_position"
                value={formData.preferred_position}
                onChange={(e) => handleInputChange('preferred_position', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select preferred position (optional)</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Profile Image Upload */}
          <div className="flex justify-center">
            <ImageUpload
              currentImageUrl={formData.photo_url}
              onImageUploaded={handleImageUpload}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Player...' : 'Create Player'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Important Note</p>
              <p className="text-sm text-blue-700">
                The player has been created with a temporary password: <strong>TempPassword123!</strong>
                <br />
                They should change this password on their first login. The player is automatically approved and can immediately participate in matches.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
