import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export const signupSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

export const profileSchema = z.object({
  name: z.string().trim().max(80).optional(),
})

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
export type ProfileValues = z.infer<typeof profileSchema>
