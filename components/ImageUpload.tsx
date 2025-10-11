'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'
import { Upload, X, User, Camera } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (url: string) => void
  userId?: string
  disabled?: boolean
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  userId,
  disabled = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Supabase Storage
    await uploadImage(file)
  }

  const uploadImage = async (file: File) => {
    try {
      setUploading(true)

      // Get current user if userId not provided
      const { data: { user } } = await supabase.auth.getUser()
      const uploadUserId = userId || user?.id

      if (!uploadUserId) {
        throw new Error('User not authenticated')
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${uploadUserId}/${Date.now()}.${fileExt}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('player-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-images')
        .getPublicUrl(fileName)

      // Update parent component
      onImageUploaded(publicUrl)

    } catch (error: any) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image: ' + error.message)
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setPreviewUrl(null)
    onImageUploaded('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Image Preview */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Player profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}

            {/* Remove button */}
            {previewUrl && !disabled && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                onClick={removeImage}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Upload Controls */}
          {!disabled && (
            <div className="flex flex-col items-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={triggerFileSelect}
                disabled={uploading}
                className="flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>{previewUrl ? 'Change Image' : 'Upload Image'}</span>
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                JPG, PNG, GIF up to 5MB
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
