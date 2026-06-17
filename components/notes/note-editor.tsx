"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { createNote, updateNote } from "@/lib/actions/notes"
import type { Note } from "@/types/database"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  title: z.string().trim().max(200).optional(),
  category: z.string().trim().max(60).optional(),
  body: z.string().trim().min(1, "Write something first.").max(20000),
})

type FormValues = z.infer<typeof formSchema>

export function NoteEditor({
  open,
  onOpenChange,
  note,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: Note | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(note)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", category: "", body: "" },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      title: note?.title ?? "",
      category: note?.category ?? "",
      body: note?.body ?? "",
    })
  }, [open, note, form])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        if (isEdit && note) {
          await updateNote({
            id: note.id,
            title: values.title || undefined,
            category: values.category || undefined,
            body: values.body,
          })
          toast.success("Note saved")
        } else {
          await createNote({
            title: values.title || undefined,
            category: values.category || undefined,
            body: values.body,
          })
          toast.success("Note created")
        }
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit note" : "New note"}</SheetTitle>
          <SheetDescription>
            Capture a thought. Title and category are optional.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 overflow-hidden px-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. meeting, idea" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="flex flex-1 flex-col">
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      className="flex-1 resize-none"
                      placeholder="Write your note…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {isEdit ? "Save note" : "Create note"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
