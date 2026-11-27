"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ApiResult } from "@rjnx/shared";
import { updateAvatarAction, updateProfileAction, updateUsernameAction } from "@/server/actions/player";

export function ProfileForms({
  games,
  profile,
}: {
  games: { id: string; name: string }[];
  profile: {
    username: string;
    full_name: string;
    phone: string;
    country: string;
    state: string;
    bio: string;
    in_game_name: string;
    game_uid: string;
    primary_game_id: string;
    avatar_url: string | null;
  };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(updateProfileAction, null);
  const [nameState, nameAction, namePending] = useActionState<ApiResult<null> | null, FormData>(updateUsernameAction, null);
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(profile.avatar_url);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Profile updated.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  React.useEffect(() => {
    if (nameState?.ok) {
      toast.success("Username updated.");
      router.refresh();
    } else if (nameState && !nameState.ok) {
      toast.error(nameState.error);
    }
  }, [nameState, router]);

  async function uploadAvatar(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    const result = await updateAvatarAction(formData);
    setUploading(false);
    if (result.ok) {
      setPreview(result.data.url);
      toast.success("Avatar updated.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-rjnx-blue to-rjnx-purple font-display text-lg font-black text-black">
          {preview ? (
             
            <img src={preview} alt="Avatar" className="size-full object-cover" />
          ) : (
            profile.username.slice(0, 2).toUpperCase()
          )}
        </span>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 hover:border-rjnx-blue/40">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {uploading ? "Uploading…" : "Upload avatar"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </label>
          <p className="mt-1 text-[10px] text-white/35">PNG/JPG/WebP · max 2 MB</p>
        </div>
      </div>

      <form action={nameAction} className="flex flex-wrap items-end gap-3 rounded-md border border-white/[0.07] bg-white/[0.02] p-3">
        {nameState && !nameState.ok ? <Alert variant="error">{nameState.error}</Alert> : null}
        <Field label="Username" htmlFor="username" className="flex-1">
          <Input id="username" name="username" defaultValue={profile.username} required minLength={3} maxLength={24} />
        </Field>
        <Button type="submit" variant="secondary" disabled={namePending}>
          {namePending ? <Loader2 className="size-4 animate-spin" /> : null} Update username
        </Button>
      </form>

      <form action={action} className="space-y-3">
        {state && !state.ok ? <Alert variant="error" title="Update failed">{state.error}</Alert> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={profile.full_name} maxLength={80} />
          </Field>
          <Field label="Phone number" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={profile.phone} placeholder="+91 90000 00000" maxLength={20} />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" name="country" defaultValue={profile.country} placeholder="India" maxLength={60} />
          </Field>
          <Field label="State" htmlFor="state">
            <Input id="state" name="state" defaultValue={profile.state} placeholder="Assam" maxLength={60} />
          </Field>
          <Field label="In-game name" htmlFor="in_game_name">
            <Input id="in_game_name" name="in_game_name" defaultValue={profile.in_game_name} placeholder="SavageKing" maxLength={40} />
          </Field>
          <Field label="Game UID" htmlFor="game_uid">
            <Input id="game_uid" name="game_uid" defaultValue={profile.game_uid} placeholder="123456789" maxLength={40} />
          </Field>
        </div>

        <Field label="Primary game" htmlFor="primary_game_id">
          <Select id="primary_game_id" name="primary_game_id" defaultValue={profile.primary_game_id}>
            <option value="">Not set</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Bio" htmlFor="bio" hint="Max 280 characters">
          <Textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={280} placeholder="Squad IGL. Free Fire main. Guwahati." />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save profile
        </Button>
      </form>
    </div>
  );
}
