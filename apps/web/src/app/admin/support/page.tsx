import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { TicketReplyForm } from "./reply-form";
import { requireStaff } from "@/server/auth";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) ?? "open";
  const session = await requireStaff("/admin/support");

  let query = session.supabase
    .from("support_tickets")
    .select("id, subject, message, category, status, admin_reply, created_at, profile:profiles(username, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    subject: string;
    message: string;
    category: string;
    status: string;
    admin_reply: string | null;
    created_at: string;
    profile: { username: string; email: string | null } | null;
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader title="Support tickets" subtitle="Reply to player issues. Replies notify the player instantly." />

      <div className="flex flex-wrap gap-1">
        {["open", "in_progress", "resolved", "closed", "all"].map((value) => (
          <a
            key={value}
            href={`/admin/support?status=${value}`}
            className={`rounded-md border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.14em] ${
              status === value ? "border-rjnx-pink/50 bg-rjnx-pink/10 text-white" : "border-white/10 text-white/45"
            }`}
          >
            {value.replace("_", " ")}
          </a>
        ))}
      </div>

      <AdminPanel title={`${rows.length} tickets`}>
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((ticket) => (
              <div key={ticket.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{ticket.subject}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {ticket.profile?.username} · {ticket.category} · {formatDate(ticket.created_at)}
                    </p>
                  </div>
                  <Badge tone={ticket.status === "resolved" ? "green" : ticket.status === "open" ? "blue" : "amber"}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs text-white/60">{ticket.message}</p>
                {ticket.admin_reply ? (
                  <div className="mt-2 rounded border-l-2 border-rjnx-blue/60 bg-rjnx-blue/[0.06] p-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-rjnx-blue">Your reply</p>
                    <p className="mt-1 text-xs text-white/75">{ticket.admin_reply}</p>
                  </div>
                ) : null}
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-rjnx-blue">Reply</summary>
                  <div className="mt-2">
                    <TicketReplyForm ticketId={ticket.id} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<MessageSquare className="size-6" />} title="No tickets" description="Nothing in this queue." />
        )}
      </AdminPanel>
    </div>
  );
}
