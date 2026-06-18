"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Folder as FolderIcon,
  FolderInput,
  FolderPlus,
  Inbox,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { createFolder, deleteFolder, renameFolder } from "@/lib/actions/folders"
import { deleteNote, listNotes, moveNoteToFolder } from "@/lib/actions/notes"
import type { Folder, Note } from "@/types/database"
import { cn } from "@/lib/utils"
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { NoteEditor } from "@/components/notes/note-editor"

type Selection = "all" | "unfiled" | string

export function NotesView({
  initialNotes,
  initialFolders,
}: {
  initialNotes: Note[]
  initialFolders: Folder[]
}) {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [folders, setFolders] = useState<Folder[]>(initialFolders)
  const [selected, setSelected] = useState<Selection>("all")
  const [search, setSearch] = useState("")
  const [isSearching, startSearch] = useTransition()
  const firstRender = useRef(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)

  // Folder dialogs.
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderEditing, setFolderEditing] = useState<Folder | null>(null)
  const [folderName, setFolderName] = useState("")
  const [folderPending, startFolder] = useTransition()
  const [pendingFolderDelete, setPendingFolderDelete] = useState<Folder | null>(
    null
  )

  useEffect(() => setNotes(initialNotes), [initialNotes])
  useEffect(() => setFolders(initialFolders), [initialFolders])

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

  // Live counts from the current note set.
  const counts = useMemo(() => {
    const byFolder = new Map<string, number>()
    let unfiled = 0
    for (const n of notes) {
      if (n.folder_id) byFolder.set(n.folder_id, (byFolder.get(n.folder_id) ?? 0) + 1)
      else unfiled += 1
    }
    return { byFolder, unfiled, all: notes.length }
  }, [notes])

  const visibleNotes = useMemo(() => {
    if (selected === "all") return notes
    if (selected === "unfiled") return notes.filter((n) => !n.folder_id)
    return notes.filter((n) => n.folder_id === selected)
  }, [notes, selected])

  const folderName_ = (id: string | null) =>
    id ? (folders.find((f) => f.id === id)?.name ?? null) : null

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

  function moveNote(note: Note, folderId: string | null) {
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, folder_id: folderId } : n))
    )
    startSearch(async () => {
      try {
        await moveNoteToFolder(note.id, folderId)
        toast.success(
          folderId
            ? `Moved to ${folderName_(folderId) ?? "folder"}`
            : "Removed from folder"
        )
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not move note")
        router.refresh()
      }
    })
  }

  function openNewFolder() {
    setFolderEditing(null)
    setFolderName("")
    setFolderDialogOpen(true)
  }
  function openRenameFolder(folder: Folder) {
    setFolderEditing(folder)
    setFolderName(folder.name)
    setFolderDialogOpen(true)
  }

  function submitFolder() {
    const name = folderName.trim()
    if (!name) return
    startFolder(async () => {
      try {
        if (folderEditing) {
          await renameFolder({ id: folderEditing.id, name })
          setFolders((prev) =>
            prev.map((f) => (f.id === folderEditing.id ? { ...f, name } : f))
          )
          toast.success("Folder renamed")
        } else {
          const created = await createFolder({ name })
          setFolders((prev) =>
            [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
          )
          toast.success("Folder created")
        }
        setFolderDialogOpen(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      }
    })
  }

  function confirmFolderDelete() {
    if (!pendingFolderDelete) return
    const folder = pendingFolderDelete
    setPendingFolderDelete(null)
    setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    setNotes((prev) =>
      prev.map((n) => (n.folder_id === folder.id ? { ...n, folder_id: null } : n))
    )
    if (selected === folder.id) setSelected("all")
    startFolder(async () => {
      try {
        await deleteFolder(folder.id)
        toast.success("Folder deleted")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete folder")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Folders */}
      <div className="flex flex-wrap items-center gap-2">
        <FolderChip
          active={selected === "all"}
          onClick={() => setSelected("all")}
          icon={<Layers className="size-4" />}
          label="All notes"
          count={counts.all}
        />
        <FolderChip
          active={selected === "unfiled"}
          onClick={() => setSelected("unfiled")}
          icon={<Inbox className="size-4" />}
          label="Unfiled"
          count={counts.unfiled}
        />
        {folders.map((folder) => (
          <FolderChip
            key={folder.id}
            active={selected === folder.id}
            onClick={() => setSelected(folder.id)}
            icon={<FolderIcon className="size-4" />}
            label={folder.name}
            count={counts.byFolder.get(folder.id) ?? 0}
            menu={
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Folder actions"
                    className="-mr-1"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onSelect={() => openRenameFolder(folder)}>
                    <Pencil />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setPendingFolderDelete(folder)}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ))}
        <Button variant="outline" size="sm" onClick={openNewFolder}>
          <FolderPlus />
          New folder
        </Button>
      </div>

      {/* Search + new note */}
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

      {/* Notes */}
      {visibleNotes.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {search
            ? `No notes match “${search}”.`
            : selected === "all"
              ? "No notes yet. Create your first one."
              : "No notes here yet."}
        </p>
      ) : (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy={isSearching}
        >
          {visibleNotes.map((note) => (
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
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <FolderInput className="text-muted-foreground" />
                          Move to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            disabled={!note.folder_id}
                            onSelect={() => moveNote(note, null)}
                          >
                            <Inbox />
                            Unfiled
                          </DropdownMenuItem>
                          {folders.length > 0 ? <DropdownMenuSeparator /> : null}
                          {folders.map((f) => (
                            <DropdownMenuItem
                              key={f.id}
                              disabled={note.folder_id === f.id}
                              onSelect={() => moveNote(note, f.id)}
                            >
                              <FolderIcon />
                              {f.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="secondary">{note.category}</Badge>
                    {note.folder_id ? (
                      <Badge variant="outline" className="gap-1">
                        <FolderIcon className="size-3" />
                        {folderName_(note.folder_id)}
                      </Badge>
                    ) : null}
                  </div>
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
        folders={folders}
        defaultFolderId={
          !editing && selected !== "all" && selected !== "unfiled"
            ? selected
            : null
        }
      />

      {/* Note delete confirm */}
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

      {/* New / rename folder */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderEditing ? "Rename folder" : "New folder"}
            </DialogTitle>
            <DialogDescription>
              {folderEditing
                ? "Give this folder a new name."
                : "Group related notes together."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            maxLength={80}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                submitFolder()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitFolder}
              disabled={!folderName.trim() || folderPending}
            >
              {folderPending ? <Spinner /> : null}
              {folderEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder delete confirm */}
      <Dialog
        open={Boolean(pendingFolderDelete)}
        onOpenChange={(open) => !open && setPendingFolderDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete folder</DialogTitle>
            <DialogDescription>
              Delete “{pendingFolderDelete?.name}”? Its notes won’t be deleted —
              they’ll just become unfiled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingFolderDelete(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmFolderDelete}>
              Delete folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FolderChip({
  active,
  onClick,
  icon,
  label,
  count,
  menu,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
  menu?: React.ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick()
      }}
      className={cn(
        "group/chip flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-border hover:border-primary/40 hover:bg-muted"
      )}
    >
      <span className={cn(active ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="max-w-40 truncate font-medium">{label}</span>
      <Badge variant={active ? "default" : "secondary"} className="ml-0.5">
        {count}
      </Badge>
      {menu}
    </div>
  )
}
