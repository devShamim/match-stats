'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/context/UserContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Target
} from 'lucide-react'

const navigation = [
  { name: 'Statistics', href: '/stats', icon: Target },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Matches', href: '/matches', icon: Calendar },
  { name: 'Leaderboards', href: '/leaderboards', icon: Trophy },
]

const adminNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Admin', href: '/admin', icon: Settings },
]

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
}

export default function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut, isAdmin } = useUser()
  const { showToast } = useToast()

  return (
    <div className={cn(
      "flex flex-col bg-gray-900 transition-all duration-300 ease-in-out h-full",
      isExpanded ? "w-64" : "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {isExpanded ? (
          <h1 className="text-xl font-bold text-white">⚽ <a href="/stats" className="text-white">Football Stats</a></h1>
        ) : (
          <div className="text-xl"><a href="/stats" className="text-white">⚽</a></div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-gray-300 hover:text-white hover:bg-gray-700"
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
              title={!isExpanded ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isExpanded && (
                <span className="ml-3">{item.name}</span>
              )}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="border-t border-gray-700 my-4" />
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                  title={!isExpanded ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isExpanded && (
                    <span className="ml-3">{item.name}</span>
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-700 p-4">
        {user ? (
          <div className="flex items-center">
            {isExpanded ? (
              <>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    {isAdmin ? 'Admin' : 'Player'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await signOut()
                      showToast('Successfully signed out', 'success')
                    } catch (error) {
                      console.error('Logout error:', error)
                      showToast('Failed to sign out. Please try again.', 'error')
                    }
                  }}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 ml-2"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await signOut()
                    showToast('Successfully signed out', 'success')
                  } catch (error) {
                    console.error('Logout error:', error)
                    showToast('Failed to sign out. Please try again.', 'error')
                  }
                }}
                className="text-gray-300 hover:text-white hover:bg-gray-700"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            {isExpanded ? (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                {/* <Button size="sm" asChild className="flex-1">
                  <Link href="/auth/register">Sign Up</Link>
                </Button> */}
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/login" title="Sign In">
                    <span className="text-xs">IN</span>
                  </Link>
                </Button>
                {/* <Button size="sm" asChild>
                  <Link href="/auth/register" title="Sign Up">
                    <span className="text-xs">UP</span>
                  </Link>
                </Button> */}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}