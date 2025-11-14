'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export default function TopHeader() {
  const { user, signOut } = useUser()

  if (!user) {
    return (
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-xl font-bold text-gray-900 cursor-pointer">⚽ Football Stats</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <a href="/auth/login">Sign In</a>
            </Button>
            {/* <Button asChild>
              <a href="/auth/register">Sign Up</a>
            </Button> */}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">⚽ Football Stats</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{user.email}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
