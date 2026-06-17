"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { createTask, updateTask } from "@/lib/actions/tasks"
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TASK_STATUSES as unknown as [string, ...string[]]),
  dueDate: z.date().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = "backlog",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  defaultStatus?: TaskStatus
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = Boolean(task)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      dueDate: undefined,
    },
  })

  // Reset the form whenever the dialog opens for a different task/column.
  useEffect(() => {
    if (!open) return
    form.reset({
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: (task?.status as TaskStatus) ?? defaultStatus,
      dueDate: task?.due_date ? new Date(`${task.due_date}T00:00:00`) : undefined,
    })
  }, [open, task, defaultStatus, form])

  function onSubmit(values: FormValues) {
    const dueDate = values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : null

    startTransition(async () => {
      try {
        if (isEdit && task) {
          await updateTask({
            id: task.id,
            title: values.title,
            description: values.description || null,
            status: values.status as TaskStatus,
            dueDate,
          })
          toast.success("Task updated")
        } else {
          await createTask({
            title: values.title,
            description: values.description || null,
            status: values.status as TaskStatus,
            dueDate,
          })
          toast.success("Task created")
        }
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this task."
              : "Add a task to your board."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Update the homepage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Optional details…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {TASK_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon />
                            {field.value
                              ? format(field.value, "PP")
                              : "No due date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          autoFocus
                        />
                        {field.value ? (
                          <div className="border-t p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange(undefined)}
                            >
                              Clear
                            </Button>
                          </div>
                        ) : null}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {isEdit ? "Save changes" : "Create task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
