"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteAccount } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [pending, startTransition] = useTransition()

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteAccount()
      } catch (error) {
        // A redirect throws NEXT_REDIRECT — let it propagate.
        if (
          error &&
          typeof error === "object" &&
          "digest" in error &&
          String((error as { digest?: string }).digest).startsWith(
            "NEXT_REDIRECT"
          )
        ) {
          throw error
        }
        toast.error(
          error instanceof Error ? error.message : "Could not delete account"
        )
      }
    })
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently delete your account and all your tasks, notes, timesheets,
          and documents. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete my account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently erases everything in your workspace. Type{" "}
                <span className="text-foreground font-semibold">DELETE</span> to
                confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="confirm-delete" className="sr-only">
                Type DELETE to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirm !== "DELETE" || pending}
                onClick={onDelete}
              >
                {pending ? (
                  <>
                    <Spinner />
                    Deleting…
                  </>
                ) : (
                  "Delete account"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
