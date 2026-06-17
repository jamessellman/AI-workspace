"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/actions/utils"
import {
  listTimeSchema,
  logTimeSchema,
  type ListTimeInput,
  type LogTimeInput,
} from "@/lib/validation/timesheet"
import type { Timesheet } from "@/types/database"

/**
 * Single source of truth for timesheet reads/writes — shared by the
 * Timesheets UI and the Phase 2 AI `log_time` / `list_time` tools.
 */

export async function listTimesheets(
  filter?: ListTimeInput
): Promise<Timesheet[]> {
  const { supabase } = await requireUser()
  const values = filter ? listTimeSchema.parse(filter) : {}

  let q = supabase
    .from("timesheets")
    .select("*")
    .order("worked_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (values.project) q = q.eq("project", values.project)
  if (values.from) q = q.gte("worked_on", values.from)
  if (values.to) q = q.lte("worked_on", values.to)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function logTime(input: LogTimeInput): Promise<Timesheet> {
  const { supabase, userId } = await requireUser()
  const values = logTimeSchema.parse(input)

  const { data, error } = await supabase
    .from("timesheets")
    .insert({
      user_id: userId,
      project: values.project,
      hours: values.hours,
      summary: values.summary ?? "",
      worked_on: values.workedOn ?? new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/timesheets")
  return data
}

export async function deleteTimesheet(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("timesheets").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/timesheets")
}

/** Distinct project names for filter dropdowns / AI hints. */
export async function listProjects(): Promise<string[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("timesheets")
    .select("project")
    .order("project", { ascending: true })

  if (error) throw new Error(error.message)
  return Array.from(new Set((data ?? []).map((r) => r.project)))
}
