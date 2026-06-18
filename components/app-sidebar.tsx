"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, FileText, KanbanSquare, StickyNote } from "lucide-react"

import { cn } from "@/lib/utils"
import { SidebarChat } from "@/components/chat/sidebar-chat"
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  { title: "Board", href: "/board", icon: KanbanSquare },
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Timesheets", href: "/timesheets", icon: Clock },
  { title: "Documents", href: "/documents", icon: FileText },
] as const

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="group/brand flex items-center gap-2 px-2 py-1.5">
          <div className="relative flex size-7 items-center justify-center">
            <span
              aria-hidden
              className="bg-primary absolute inset-0 rounded-md blur-md [animation:glow-pulse_4s_ease-in-out_infinite]"
            />
            <div className="from-primary bg-gradient-to-br to-[color-mix(in_oklch,var(--primary),var(--chart-3)_55%)] text-primary-foreground relative flex size-7 items-center justify-center rounded-md text-sm font-semibold shadow-lg transition-transform duration-300 group-hover/brand:scale-110 group-hover/brand:rotate-3">
              W
            </div>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            AI Workspace
          </span>
        </div>
      </SidebarHeader>

      <SidebarGroup className="gap-1 pt-2">
        <SidebarGroupLabel className="mb-1">Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      // Taller rows for more vertical breathing room.
                      "h-10",
                      // Animated left accent bar + slide-in on hover/active.
                      "relative overflow-hidden transition-[transform,background-color,color,box-shadow] duration-200 ease-out hover:translate-x-1",
                      "before:bg-primary before:absolute before:top-1/2 before:left-0 before:h-0 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:transition-all before:duration-300 before:content-['']",
                      "hover:before:h-4",
                      isActive &&
                        "before:h-5 shadow-[0_0_24px_-12px_var(--primary)]"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon
                        className={cn(
                          "transition-transform duration-200 group-hover/menu-button:scale-115",
                          isActive && "text-primary"
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Persistent assistant — docked here so it's reachable from any page. */}
      <div className="border-sidebar-border mt-1 flex min-h-0 flex-1 flex-col border-t pt-2">
        <SidebarChat />
      </div>
    </Sidebar>
  )
}
