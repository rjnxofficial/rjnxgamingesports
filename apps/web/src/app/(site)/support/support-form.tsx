"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ApiResult } from "@rjnx/shared";
import { createSupportTicketAction } from "@/server/actions/player";

export function SupportForm({ defaultCategory }: { defaultCategory?: string }) {
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(createSupportTicketAction, null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Ticket opened. Watch your notifications for a reply.");
      formRef.current?.reset();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.ok ? (
        <Alert variant="success" title="Ticket submitted">
          Our team replies within 24 hours on match days.
        </Alert>
      ) : null}
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}

      <Field label="Subject" htmlFor="subject" required>
        <Input id="subject" name="subject" required minLength={4} maxLength={120} placeholder="Room ID not visible for BGMI finals" />
      </Field>
      <Field label="Category" htmlFor="category" required>
        <Select id="category" name="category" defaultValue={defaultCategory ?? "other"}>
          <option value="account">Account</option>
          <option value="tournament">Tournament</option>
          <option value="payment">Payment</option>
          <option value="technical">Technical</option>
          <option value="report">Report a player</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Message" htmlFor="message" required>
        <Textarea id="message" name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Include tournament name, match number and screenshots links." />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit ticket
      </Button>
    </form>
  );
}
