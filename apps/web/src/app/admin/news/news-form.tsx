"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { saveNewsAction } from "@/server/actions/admin";
import { slugify, type ApiResult } from "@rjnx/shared";

export function NewsForm({
  defaults,
}: {
  defaults?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    cover_url: string;
    is_published: boolean;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ApiResult<null> | null, FormData>(saveNewsAction, null);
  const [title, setTitle] = React.useState(defaults?.title ?? "");
  const [slug, setSlug] = React.useState(defaults?.slug ?? "");
  const [touched, setTouched] = React.useState(Boolean(defaults?.slug));

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Article saved.");
      router.refresh();
      if (!defaults) {
        setTitle("");
        setSlug("");
      }
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router, defaults]);

  return (
    <form action={formAction} className="space-y-3">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" htmlFor={`title-${defaults?.id ?? "new"}`} required>
          <Input
            id={`title-${defaults?.id ?? "new"}`}
            name="title"
            required
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!touched) setSlug(slugify(event.target.value));
            }}
          />
        </Field>
        <Field label="Slug" htmlFor={`slug-${defaults?.id ?? "new"}`} required>
          <Input
            id={`slug-${defaults?.id ?? "new"}`}
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setTouched(true);
              setSlug(event.target.value);
            }}
          />
        </Field>
      </div>

      <Field label="Excerpt" htmlFor={`excerpt-${defaults?.id ?? "new"}`}>
        <Input id={`excerpt-${defaults?.id ?? "new"}`} name="excerpt" defaultValue={defaults?.excerpt} maxLength={300} />
      </Field>
      <Field label="Cover image URL" htmlFor={`cover-${defaults?.id ?? "new"}`}>
        <Input id={`cover-${defaults?.id ?? "new"}`} name="cover_url" defaultValue={defaults?.cover_url} placeholder="/brand/news-season4.svg" />
      </Field>
      <Field label="Content" htmlFor={`content-${defaults?.id ?? "new"}`} required>
        <Textarea id={`content-${defaults?.id ?? "new"}`} name="content" rows={6} defaultValue={defaults?.content} required minLength={10} />
      </Field>
      <Checkbox label="Published" name="is_published" defaultChecked={defaults?.is_published ?? false} />

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save article
      </Button>
    </form>
  );
}
