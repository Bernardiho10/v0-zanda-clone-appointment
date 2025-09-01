"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Menu,
  Wrench,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    title: "People",
    icon: Users,
    children: [
      { title: "Clients", href: "/people/clients", icon: Users },
      { title: "Practitioners", href: "/people/practitioners", icon: Users },
      { title: "Staff", href: "/people/staff", icon: Users },
    ],
  },
  {
    title: "Sales",
    icon: DollarSign,
    children: [
      { title: "Invoices", href: "/sales/invoices", icon: FileText },
      { title: "Payments", href: "/sales/payments", icon: DollarSign },
      { title: "Products", href: "/sales/products", icon: FileText },
    ],
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Reports",
    icon: FileText,
    children: [
      { title: "Appointment Reports", href: "/reports/appointments", icon: Calendar },
      { title: "Financial Reports", href: "/reports/financial", icon: DollarSign },
      { title: "Client Reports", href: "/reports/clients", icon: Users },
    ],
  },
  {
    title: "Tools",
    icon: Wrench,
    children: [
      { title: "Bulk Actions", href: "/tools/bulk", icon: Wrench },
      { title: "Import/Export", href: "/tools/import-export", icon: FileText },
      { title: "Integrations", href: "/tools/integrations", icon: Settings },
    ],
  },
  {
    title: "Practice Manual",
    href: "/practice-manual",
    icon: BookOpen,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Help",
    icon: HelpCircle,
    children: [
      { title: "Documentation", href: "/help/docs", icon: BookOpen },
      { title: "Support", href: "/help/support", icon: HelpCircle },
      { title: "Training", href: "/help/training", icon: BookOpen },
    ],
  },
]

export function AppSidebar({ isOpen = true, onClose, className }: AppSidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(["People", "Sales", "Reports", "Tools", "Help"])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + "/")
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const active = isActive(item.href)

    if (hasChildren) {
      return (
        <Collapsible key={item.title} open={isExpanded} onOpenChange={() => toggleExpanded(item.title)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                level > 0 && "pl-6",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map((child) => renderNavItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <Button
        key={item.title}
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-10 px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          level > 0 && "pl-6",
          active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        )}
        asChild
      >
        <Link href={item.href || "#"}>
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.title}</span>
          {item.badge && (
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">{item.badge}</span>
          )}
        </Link>
      </Button>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-sidebar border-r border-sidebar-border z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border lg:hidden">
          <span className="font-semibold text-sidebar-foreground">Menu</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">{navigationItems.map((item) => renderNavItem(item))}</nav>
        </ScrollArea>
      </aside>
    </>
  )
}
