import { LifeBuoy, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { SupportForm } from "@/app/(site)/support/support-form";
import { requireUser } from "@/server/auth";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function DashboardSupportPage() {
  const session = await requireUser("/dashboard/support");

  const { data } = await session.supabase
    .from("support_tickets")
    .select("id, subject, category, status, message, admin_reply, replied_at, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const tickets = (data ?? []) as {
    id: string;
    subject: string;
    category: string;
    status: string;
    message: string;
    admin_reply: string | null;
    replied_at: string | null;
    created_at: string;
  }[];

  const hasStaffRole = session.isStaff;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Help desk" title="Support" subtitle="Open a ticket — replies land in your notification inbox." />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <LifeBuoy className="size-4 text-rjnx-blue" /> New ticket
          </h2>
          <div className="mt-3">
            <SupportForm />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <MessageSquare className="size-4 text-rjnx-purple" /> My tickets
          </h2>
          {tickets.length ? (
            <ul className="mt-3 space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="rounded-md border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{ticket.subject}</p>
                    <Badge
                      tone={
                        ticket.status === "resolved" ? "green" : ticket.status === "open" ? "blue" : ticket.status === "in_progress" ? "amber" : "neutral"
                      }
                    >
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/35">
                    {ticket.category} · {formatDate(ticket.created_at)}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-white/55">{ticket.message}</p>
                  {ticket.admin_reply ? (
                    <div className="mt-2 rounded border-l-2 border-rjnx-blue/60 bg-rjnx-blue/[0.06] p-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-rjnx-blue">Staff reply</p>
                      <p className="mt-1 text-xs text-white/75">{ticket.admin_reply}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="mt-3" title="No tickets yet" description="Nothing open. Use the form on the left if you need help." icon={<LifeBuoy className="size-5" />} />
          )}
          {hasStaffRole ? (
            <p className="mt-4 text-[11px] text-white/35">
              Staff tools: manage all tickets from the admin command center.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
