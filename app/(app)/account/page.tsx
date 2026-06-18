import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { DeleteAccount } from "@/components/account/delete-account"
import { PasswordForm } from "@/components/account/password-form"
import { ProfileForm } from "@/components/account/profile-form"

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const name = (user.user_metadata?.display_name as string | null) ?? ""
  const avatarUrl = (user.user_metadata?.avatar_url as string | null) ?? ""

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Account"
        description="Manage your profile and security."
      />
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        initialName={name}
        initialAvatarUrl={avatarUrl}
      />
      <PasswordForm email={user.email ?? ""} />
      <DeleteAccount />
    </div>
  )
}
