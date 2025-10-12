'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import ImageUpload from '@/components/ImageUpload'
import { supabase } from '@/lib/supabaseClient'
import { Player } from '@/types'
import { X, Save, User } from 'lucide-react'

const POSITIONS = [
  'Goalkeeper',
  'Defender',
  'Midfielder',
  'Forward',
  'Winger',
  'Striker'
]

interface PlayerEditModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedPlayer: Player) => void
}

interface EditFormData {
  name: string
  email: string
  position: string
  phone: string
  jersey_number: string
  preferred_position: string
  photo_url: string
}

export default function PlayerEditModal({ player, isOpen, onClose, onSave }: PlayerEditModalProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    email: '',
    position: '',
    phone: '',
    jersey_number: '',
    preferred_position: '',
    photo_url: ''
  })

  // Update form data when player changes
  useEffect(() => {
    if (player) {
      setFormData({
        name: player.user_profile?.name || '',
        email: player.user_profile?.email || '',
        position: player.user_profile?.position || '',
        phone: player.user_profile?.phone || '',
        jersey_number: player.jersey_number?.toString() || '',
        preferred_position: player.preferred_position || '',
        photo_url: player.user_profile?.photo_url || ''
      })
    }
  }, [player])

  const handleInputChange = (field: keyof EditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, photo_url: imageUrl }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!player) return

    setLoading(true)

    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/update-player', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          playerId: player.id,
          userId: player.user_id,
          updates: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            position: formData.position || null,
            phone: formData.phone || null,
            jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
            preferred_position: formData.preferred_position || null,
            photo_url: formData.photo_url || null
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update player')
      }

      showToast('Player updated successfully!', 'success')
      onSave(result.player)
      onClose()
    } catch (err: any) {
      console.error('Player update error:', err)
      showToast(err.message || 'Failed to update player', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !player) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              <CardTitle>Edit Player</CardTitle>
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
          <CardDescription>
            Update player information and details
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
            <div className="flex justify-center pt-4">
              <ImageUpload
                currentImageUrl={formData.photo_url}
                onImageUploaded={handleImageUpload}
                userId={player?.user_profile?.id}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
