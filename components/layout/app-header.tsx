"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Bell, Calendar, FileText, MessageSquare, ChevronDown, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  onMenuToggle?: () => void
  className?: string
}

export function AppHeader({ onMenuToggle, className }: AppHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <header className={cn("h-16 bg-primary border-b border-primary/20 flex items-center px-4 gap-4", className)}>
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuToggle}
        className="lg:hidden text-primary-foreground hover:bg-primary/80"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
          <span className="text-primary font-bold text-lg">Z</span>
        </div>
        <span className="text-primary-foreground font-semibold text-lg hidden sm:block">zanda</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Quick Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:bg-white focus:text-foreground"
        />
      </div>

      {/* Notification Icons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/80 relative">
          <Calendar className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-orange-500 text-white text-xs">9</Badge>
        </Button>

        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/80">
          <FileText className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/80">
          <MessageSquare className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/80 relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 text-white text-xs">99</Badge>
        </Button>
      </div>

      {/* User/Tenant Info */}
      <div className="flex items-center gap-3 border-l border-primary-foreground/20 pl-4">
        <div className="text-right hidden sm:block">
          <p className="text-primary-foreground font-medium text-sm">Bodymotions Physio Lounge</p>
          <div className="flex items-center gap-1">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-xs bg-primary-foreground text-primary">O</AvatarFallback>
            </Avatar>
            <span className="text-primary-foreground/80 text-xs">Olutoyin Adeola</span>
            <ChevronDown className="h-3 w-3 text-primary-foreground/60" />
          </div>
        </div>

        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary-foreground text-primary font-medium">O</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
