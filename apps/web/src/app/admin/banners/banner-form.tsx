"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { saveBannerAction } from "@/server/actions/admin";
import type { ApiResult } from "@rjnx/shared";

export function BannerForm({
  defaults,
}: {
  defaults?: {
    id: string;
    title: string;
    subtitle: string;
    image_url: string;
    link_url: string;
    placement: string;
    is_active: boolean;
    sort_order: number;
  };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(saveBannerAction, null);
  const id = defaults?.id ?? "new";

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Banner saved.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" htmlFor={`btitle-${id}`} required>
          <Input id={`btitle-${id}`} name="title" required defaultValue={defaults?.title} maxLength={80} />
        </Field>
        <Field label="Subtitle" htmlFor={`bsub-${id}`}>
          <Input id={`bsub-${id}`} name="subtitle" defaultValue={defaults?.subtitle} maxLength={140} />
        </Field>
      </div>
      <Field label="Image URL" htmlFor={`bimg-${id}`} required hint="Use /brand/… assets or a Supabase storage URL">
        <Input id={`bimg-${id}`} name="image_url" required defaultValue={defaults?.image_url} placeholder="/brand/hero-arena.svg" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Link URL" htmlFor={`blink-${id}`}>
          <Input id={`blink-${id}`} name="link_url" defaultValue={defaults?.link_url} placeholder="/tournaments" />
        </Field>
        <Field label="Placement" htmlFor={`bplace-${id}`} required>
          <Select id={`bplace-${id}`} name="placement" defaultValue={defaults?.placement ?? "home_hero"}>
            <option value="home_hero">Home hero</option>
            <option value="home_strip">Home strip</option>
            <option value="tournaments">Tournaments</option>
            <option value="sidebar">Sidebar</option>
          </Select>
        </Field>
        <Field label="Sort order" htmlFor={`border-${id}`}>
          <Input id={`border-${id}`} name="sort_order" type="number" min={0} max={999} defaultValue={defaults?.sort_order ?? 0} />
        </Field>
      </div>
      <Checkbox label="Active" name="is_active" defaultChecked={defaults?.is_active ?? true} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save banner
      </Button>
    </form>
  );
}
