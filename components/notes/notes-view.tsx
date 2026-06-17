"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteNote, listNotes } from "@/lib/actions/notes"
import type { Note } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NoteEditor } from "@/components/notes/note-editor"

export function NotesView({ initialNotes }: { initialNotes: Note[] }) {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [search, setSearch] = useState("")
  const [isSearching, startSearch] = useTransition()
  const firstRender = useRef(true)

  // Editor + delete dialog state. NoteEditor is loaded lazily to keep this
  // component lean; import statically for simplicity here.
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  // Debounced server-side full-text search.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const handle = setTimeout(() => {
      startSearch(async () => {
        try {
          setNotes(await listNotes(search))
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Search failed")
        }
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [search])

  function openNew() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(note: Note) {
    setEditing(note)
    setEditorOpen(true)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const note = pendingDelete
    setPendingDelete(null)
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    startSearch(async () => {
      try {
        await deleteNote(note.id)
        toast.success("Note deleted")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete note")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8"
          />
        </div>
        <Button onClick={openNew}>
          <Plus />
          New note
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {search
            ? `No notes match “${search}”.`
            : "No notes yet. Create your first one."}
        </p>
      ) : (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy={isSearching}
        >
          {notes.map((note) => (
            <Card
              key={note.id}
              role="button"
              tabIndex={0}
              onClick={() => openEdit(note)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openEdit(note)
              }}
              className="hover:border-ring cursor-pointer gap-2 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug break-words">
                    {note.title}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Note actions"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem onSelect={() => openEdit(note)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPendingDelete(note)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground line-clamp-4 text-xs whitespace-pre-wrap">
                  {note.body}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{note.category}</Badge>
                  <span className="text-muted-foreground text-[11px]">
                    {format(new Date(note.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editing}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note</DialogTitle>
            <DialogDescription>
              Delete “{pendingDelete?.title}”? This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
