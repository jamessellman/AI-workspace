"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB

export function ProfileForm({
  userId,
  email,
  initialName,
  initialAvatarUrl,
}: {
  userId: string
  email: string
  initialName: string
  initialAvatarUrl: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, startSave] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const initial = (name || email || "?").charAt(0).toUpperCase()

  async function onPickAvatar(file: File) {
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 2 MB")
      return
    }
    setUploading(true)
    const supabase = createClient()
    try {
      const ext = file.name.split(".").pop() || "png"
      const path = `${userId}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from("avatars").getPublicUrl(path)
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      })
      if (metaErr) throw metaErr

      setAvatarUrl(data.publicUrl)
      toast.success("Avatar updated")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload avatar"
      )
    } finally {
      setUploading(false)
    }
  }

  function saveName() {
    startSave(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { display_name: name.trim() || null },
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Profile updated")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and avatar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-lg">{initial}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPickAvatar(file)
                e.target.value = ""
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Spinner /> : <Upload />}
              Change avatar
            </Button>
            <p className="text-muted-foreground text-xs">PNG or JPG, up to 2 MB.</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
          />
        </div>

        <div className="grid gap-2">
          <Label>Email</Label>
          <Input value={email} disabled readOnly />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={saveName} disabled={saving || name === initialName}>
          {saving ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
