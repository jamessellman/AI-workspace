"use client"

import { LogOut } from "lucide-react"

import { signOut } from "@/lib/actions/auth"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem
      variant="destructive"
      onSelect={(event) => {
        event.preventDefault()
        void signOut()
      }}
    >
      <LogOut />
      Sign out
    </DropdownMenuItem>
  )
}
