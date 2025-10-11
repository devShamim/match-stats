'use client'

import { useState } from 'react'
import { useUser } from '@/context/UserContext'
import { Button } from '@/components/ui/button'
import { LogOut, User, Menu, X } from 'lucide-react'

interface MobileHeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export default function MobileHeader({ onToggleSidebar, isSidebarOpen }: MobileHeaderProps) {
  const { user, signOut } = useUser()

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="text-gray-600 hover:text-gray-900"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <h1 className="text-lg font-bold text-gray-900">⚽ Football Stats</h1>
        </div>

        {user ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 truncate max-w-32">
                {user.email}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="text-gray-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/auth/login">Sign In</a>
            </Button>
            {/* <Button size="sm" asChild>
              <a href="/auth/register">Sign Up</a>
            </Button> */}
          </div>
        )}
      </div>
    </header>
  )
}
