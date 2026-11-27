"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PayEntryButton } from "@/components/tournaments/pay-entry-button";
import { cancelRegistrationAction, registerForTournamentAction } from "@/server/actions/register";
import type { ApiResult } from "@rjnx/shared";

export interface RegisterPanelProps {
  tournamentId: string;
  tournamentName: string;
  mode: "solo" | "duo" | "squad";
  minTeamSize: number;
  maxTeamSize: number;
  status: string;
  entryFee: number;
  slots: { taken: number; approved: number };
  maxSlots: number;
  registrationEndsAt: string | null;
  requiresApproval: boolean;
  isAuthenticated: boolean;
  existingRegistration: { id: string; status: string; slot_number: number | null; team_id: string | null } | null;
  teams: { id: string; name: string; member_count: number }[];
  /** Entry fee outstanding for this player's registration, if any. */
  paymentDue?: number;
  paymentsEnabled?: boolean;
  player?: { name: string; email: string };
}

export function RegisterPanel(props: RegisterPanelProps) {
  const router = useRouter();
  const [teamId, setTeamId] = React.useState<string>(props.existingRegistration?.team_id ?? "");
  const [state, formAction, pending] = useActionState<ApiResult<null> | null, FormData>(
    registerForTournamentAction,
    null,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState<ApiResult<null> | null, FormData>(
    cancelRegistrationAction,
    null,
  );

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Registration confirmed. Check your dashboard for room details.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  React.useEffect(() => {
    if (cancelState?.ok) {
      toast.success("Registration cancelled.");
      router.refresh();
    } else if (cancelState && !cancelState.ok) {
      toast.error(cancelState.error);
    }
  }, [cancelState, router]);

  const remaining = Math.max(0, props.maxSlots - props.slots.taken);
  const closed = !["registration_open", "published"].includes(props.status);
  const deadlinePassed = props.registrationEndsAt ? new Date(props.registrationEndsAt) < new Date() : false;

  if (!props.isAuthenticated) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-white/60">Sign in to register</span>
          <span className="font-display text-xs font-bold text-rjnx-blue">{remaining} slots left</span>
        </div>
        <Link href={`/login?next=${encodeURIComponent(`/tournaments`)}`}>
          <Button className="w-full" size="lg">
            <Lock className="size-4" /> Sign in to register
          </Button>
        </Link>
        <Link href="/register">
          <Button variant="secondary" className="w-full">
            Create free account
          </Button>
        </Link>
      </div>
    );
  }

  if (props.existingRegistration) {
    const registration = props.existingRegistration;
    return (
      <div className="space-y-3">
        <Alert
          variant={registration.status === "approved" ? "success" : registration.status === "rejected" ? "error" : "info"}
          title={
            registration.status === "approved"
              ? "You're in"
              : registration.status === "pending"
                ? "Awaiting approval"
                : `Registration ${registration.status}`
          }
        >
          {registration.slot_number ? <span>Slot #{registration.slot_number} reserved. </span> : null}
          {registration.status === "approved"
            ? "Room credentials appear on your dashboard 15 minutes before each match."
            : registration.status === "pending"
              ? "An admin will review your registration shortly."
              : "Contact support if you believe this is a mistake."}
        </Alert>

        {props.paymentDue && props.paymentDue > 0 && props.paymentsEnabled ? (
          <div className="space-y-1.5">
            <PayEntryButton
              tournamentId={props.tournamentId}
              tournamentName={props.tournamentName}
              amount={props.paymentDue}
              playerName={props.player?.name ?? ""}
              playerEmail={props.player?.email ?? ""}
            />
            <p className="text-[11px] text-white/40">
              Secure Razorpay checkout. Your slot is confirmed only after the payment is verified server-side.
            </p>
          </div>
        ) : null}

        {props.paymentDue && props.paymentDue > 0 && !props.paymentsEnabled ? (
          <Alert variant="warning" title="Entry fee pending">
            Online payments are disabled on this deployment. Contact support to settle the ₹{props.paymentDue} entry fee
            and confirm your slot.
          </Alert>
        ) : null}

        <Link href="/dashboard/matches">
          <Button variant="secondary" className="w-full">
            View my matches
          </Button>
        </Link>

        {!["live", "completed"].includes(props.status) && !["cancelled", "rejected"].includes(registration.status) ? (
          <form action={cancelAction}>
            <input type="hidden" name="registration_id" value={registration.id} />
            <Button type="submit" variant="danger" className="w-full" disabled={cancelPending}>
              {cancelPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Cancel registration
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  if (closed || deadlinePassed || remaining === 0) {
    return (
      <div className="space-y-3">
        <Alert variant="warning" title={remaining === 0 ? "Lobby full" : "Registration closed"}>
          {remaining === 0
            ? "All slots are taken. Follow our socials for the next lobby."
            : "Registration for this tournament is no longer open."}
        </Alert>
        <Link href="/tournaments">
          <Button variant="secondary" className="w-full">
            Find another tournament
          </Button>
        </Link>
      </div>
    );
  }

  if (props.mode !== "solo" && props.teams.length === 0) {
    return (
      <div className="space-y-3">
        <Alert variant="info" title="Team required">
          This is a {props.mode} tournament ({props.minTeamSize}–{props.maxTeamSize} players). Create or join a squad first.
        </Alert>
        <Link href="/dashboard/teams">
          <Button className="w-full">
            <Users className="size-4" /> Build your team
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok ? <Alert variant="error" title="Registration failed">{state.error}</Alert> : null}

      <input type="hidden" name="tournament_id" value={props.tournamentId} />

      {props.mode !== "solo" ? (
        <div className="space-y-1.5">
          <label
            htmlFor="team_id"
            className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60"
          >
            Competing team
          </label>
          <Select id="team_id" name="team_id" value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
            <option value="">Select a team…</option>
            {props.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.member_count}/{props.maxTeamSize})
              </option>
            ))}
          </Select>
          {props.teams.every((team) => team.member_count < props.minTeamSize) ? (
            <p className="flex items-center gap-1 text-xs text-amber-300">
              <AlertTriangle className="size-3" /> Teams need at least {props.minTeamSize} members.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-white/60">
          {props.slots.taken}/{props.maxSlots} slots filled
        </span>
        <span className="font-display text-xs font-bold text-rjnx-blue">{remaining} left</span>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        {props.entryFee > 0 ? `Register · ₹${props.entryFee}` : "Register free"}
      </Button>

      <p className="flex items-start gap-1.5 text-[11px] text-white/40">
        <Clock className="mt-0.5 size-3 shrink-0" />
        {props.requiresApproval
          ? "This event requires admin approval. You'll be notified once reviewed."
          : "Instant confirmation. Room details arrive before match start."}
      </p>
    </form>
  );
}
