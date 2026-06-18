"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Download,
  FileText,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import {
  createDocumentSignedUrl,
  deleteDocument,
  listDocuments,
  recordDocument,
} from "@/lib/actions/documents"
import { createClient } from "@/lib/supabase/client"
import type { DocumentRow } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Card } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DocumentDetailDialog } from "@/components/documents/document-detail-dialog"

export type TaskOption = { id: string; title: string }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(1)} ${units[i]}`
}

export function DocumentsView({
  initialDocuments,
  tasks,
}: {
  initialDocuments: DocumentRow[]
  tasks: TaskOption[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState(initialDocuments)
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const [, startSearch] = useTransition()
  const firstRender = useRef(true)

  const [detail, setDetail] = useState<DocumentRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DocumentRow | null>(null)

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const handle = setTimeout(() => {
      startSearch(async () => {
        try {
          setDocuments(await listDocuments(search))
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Search failed")
        }
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [search])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = "" // allow re-selecting the same file
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const safeName = file.name.replace(/[^\w.\-]+/g, "_")
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        })
      if (uploadError) throw new Error(uploadError.message)

      await recordDocument({
        filename: file.name,
        storagePath: path,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      })

      toast.success(`Uploaded ${file.name}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc: DocumentRow) {
    try {
      const url = await createDocumentSignedUrl(doc.storage_path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open file")
    }
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const doc = pendingDelete
    setPendingDelete(null)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    startSearch(async () => {
      try {
        await deleteDocument(doc.id)
        toast.success("Document deleted")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete")
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
            placeholder="Search filename, category, summary…"
            className="pl-8"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Spinner /> : <Upload />}
          Upload
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="w-24 text-right">Size</TableHead>
              <TableHead className="w-32">Uploaded</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  {search
                    ? `No documents match “${search}”.`
                    : "No documents yet. Upload your first one."}
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer"
                  onClick={() => setDetail(doc)}
                >
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <FileText className="text-muted-foreground size-4 shrink-0" />
                      <span className="truncate">{doc.filename}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {formatBytes(Number(doc.size_bytes))}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {format(new Date(doc.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Document actions"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setDetail(doc)}>
                          <FileText />
                          Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDownload(doc)}>
                          <Download />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(doc)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <DocumentDetailDialog
        document={detail}
        tasks={tasks}
        onOpenChange={(open) => !open && setDetail(null)}
        onDownload={handleDownload}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Delete “{pendingDelete?.filename}”? The file and its metadata will
              be removed. This can’t be undone.
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
