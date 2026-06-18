import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError =
    error === "expired"
      ? "That reset link has expired or was already used. Request a new one below."
      : undefined

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ForgotPasswordForm initialError={initialError} />
    </div>
  )
}
