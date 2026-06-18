"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { MailCheck } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { signupSchema, type SignupValues } from "@/lib/validation/auth"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function SignupForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: SignupValues) {
    setServerError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { display_name: values.name?.trim() || null },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/board`,
      },
    })

    if (error) {
      setServerError(error.message)
      return
    }

    // If email confirmation is enabled there's no session yet — prompt the user
    // to confirm. Otherwise they're signed in and can go straight in.
    if (data.session) {
      router.refresh()
      router.replace("/board")
      return
    }
    setEmailSent(true)
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="bg-primary/15 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
            <MailCheck className="size-5" />
          </div>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to{" "}
            <span className="text-foreground font-medium">
              {form.getValues("email")}
            </span>
            . Click it to activate your account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Start your own AI Workspace in a few seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder="Your name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? (
              <p className="text-destructive text-sm">{serverError}</p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Spinner />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
