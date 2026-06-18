"use server"

import { revalidatePath } from "next/cache"

import { requireUser, sanitizeFilterTerm } from "@/lib/actions/utils"
import {
  createTaskSchema,
  reorderSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type TaskPosition,
  type UpdateTaskInput,
} from "@/lib/validation/task"
import type { Database, Task, TaskStatus } from "@/types/database"

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"]

/**
 * These server functions are the single source of truth for task mutations.
 * Both the Phase 1 UI and the Phase 2 AI tools call them — nothing writes to
 * the database any other way.
 */

export async function listTasks(filter?: {
  status?: TaskStatus
  query?: string
}): Promise<Task[]> {
  const { supabase } = await requireUser()

  let q = supabase
    .from("tasks")
    .select("*")
    .order("status", { ascending: true })
    .order("order_index", { ascending: true })

  if (filter?.status) {
    q = q.eq("status", filter.status)
  }
  const term = filter?.query ? sanitizeFilterTerm(filter.query) : ""
  if (term) {
    const like = `%${term}%`
    q = q.or(`title.ilike.${like},description.ilike.${like}`)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { supabase, userId } = await requireUser()
  const values = createTaskSchema.parse(input)
  const status: TaskStatus = values.status ?? "backlog"

  // Place new task at the end of its column.
  const { data: last } = await supabase
    .from("tasks")
    .select("order_index")
    .eq("status", status)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle()

  const orderIndex = (last?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: values.title,
      description: values.description ?? null,
      status,
      order_index: orderIndex,
      due_date: values.dueDate ?? null,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/board")
  return data
}

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  const { supabase } = await requireUser()
  const values = updateTaskSchema.parse(input)

  const patch: TaskUpdate = {}
  if (values.title !== undefined) patch.title = values.title
  if (values.description !== undefined) patch.description = values.description
  if (values.status !== undefined) patch.status = values.status
  if (values.dueDate !== undefined) patch.due_date = values.dueDate

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", values.id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/board")
  return data
}

/**
 * Move a task to a different column, appending it to the end. Used by the AI
 * `move_task` tool and by per-card "move to" actions.
 */
export async function moveTask({
  id,
  status,
}: {
  id: string
  status: TaskStatus
}): Promise<Task> {
  const { supabase } = await requireUser()

  const { data: last } = await supabase
    .from("tasks")
    .select("order_index")
    .eq("status", status)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle()

  const orderIndex = (last?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from("tasks")
    .update({ status, order_index: orderIndex })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/board")
  return data
}

/**
 * Persist the exact order/column of every affected task after a drag. The
 * client computes the new arrangement; we write each position. RLS ensures
 * only the user's own rows are touched.
 */
export async function reorderTasks(positions: TaskPosition[]): Promise<void> {
  const { supabase } = await requireUser()
  const { positions: parsed } = reorderSchema.parse({ positions })

  await Promise.all(
    parsed.map((p) =>
      supabase
        .from("tasks")
        .update({ status: p.status, order_index: p.orderIndex })
        .eq("id", p.id)
    )
  )

  revalidatePath("/board")
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/board")
}
