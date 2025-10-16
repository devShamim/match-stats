'use client'

import { useState } from 'react'
import { UserProvider } from '@/context/UserContext'
import { ToastProvider } from '@/components/ui/toast'
import Sidebar from '@/components/Sidebar'
import MobileHeader from '@/components/MobileHeader'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded)
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  return (
    <html lang="en">
      <head>
        <title>Football Statistics</title>
        <meta name="description" content="Track and manage football team statistics, player performance, and match results" />
        <link rel="icon" href="../favicon.ico" />
        <link rel="shortcut icon" href="../favicon.ico" />
      </head>
      <body>
        <UserProvider>
          <ToastProvider>
            <div className="flex h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              <Sidebar
                isExpanded={isSidebarExpanded}
                onToggle={toggleSidebar}
              />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileSidebar} />
                <div className="fixed left-0 top-0 h-full w-64">
                  <Sidebar
                    isExpanded={true}
                    onToggle={toggleMobileSidebar}
                  />
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile Header */}
              <MobileHeader
                onToggleSidebar={toggleMobileSidebar}
                isSidebarOpen={isMobileSidebarOpen}
              />

              {/* Page Content */}
              <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-6 py-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  )
}
