"use client"

import type React from "react"

import { useState } from "react"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuToggle={toggleSidebar} />

      <div className="flex">
        <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <main className={cn("flex-1 lg:ml-64 transition-all duration-200 ease-in-out", className)}>{children}</main>
      </div>
    </div>
  )
}
