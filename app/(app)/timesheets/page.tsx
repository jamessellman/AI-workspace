import { listTimesheets } from "@/lib/actions/timesheets"
import { PageHeader } from "@/components/page-header"
import { TimesheetsView } from "@/components/timesheets/timesheets-view"

export const dynamic = "force-dynamic"

export default async function TimesheetsPage() {
  const entries = await listTimesheets()

  return (
    <div>
      <PageHeader
        title="Timesheets"
        description="Log hours and review totals by project and date range."
      />
      <TimesheetsView initialEntries={entries} />
    </div>
  )
}
