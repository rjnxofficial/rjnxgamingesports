"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { replyTicketAction } from "@/server/actions/admin";
import type { ApiResult } from "@rjnx/shared";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(replyTicketAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Reply sent.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-2">
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Textarea name="admin_reply" required rows={3} placeholder="Reply to the player…" />
      <div className="flex items-center gap-2">
        <Select name="status" defaultValue="resolved" className="h-9 w-40 text-xs" aria-label="Ticket status">
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send reply
        </Button>
      </div>
    </form>
  );
}
