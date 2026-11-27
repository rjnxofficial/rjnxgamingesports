"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { saveTournamentAction } from "@/server/actions/admin";
import { FORMATS, MODES, slugify, type ApiResult } from "@rjnx/shared";

export interface TournamentFormValues {
  id?: string;
  name: string;
  slug: string;
  game_id: string;
  mode: string;
  format: string;
  description: string;
  rules: string;
  banner_url: string;
  entry_fee: number;
  prize_pool: number;
  max_slots: number;
  min_team_size: number;
  max_team_size: number;
  registration_starts_at: string;
  registration_ends_at: string;
  starts_at: string;
  ends_at: string;
  status: string;
  is_featured: boolean;
  requires_approval: boolean;
  scoring_rule_id: string;
  prize_place_1: number;
  prize_place_2: number;
  prize_place_3: number;
}

export function TournamentForm({
  games,
  scoringRules,
  defaults,
}: {
  games: { id: string; name: string }[];
  scoringRules: { id: string; name: string; is_default: boolean }[];
  defaults?: Partial<TournamentFormValues>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    (ApiResult<null> & { id?: string }) | null,
    FormData
  >(saveTournamentAction, null);
  const [name, setName] = React.useState(defaults?.name ?? "");
  const [slug, setSlug] = React.useState(defaults?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(Boolean(defaults?.slug));

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Tournament saved.");
      if (state.id && !defaults?.id) router.push(`/admin/tournaments/${state.id}`);
      else router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router, defaults?.id]);

  const values = defaults ?? ({} as Partial<TournamentFormValues>);

  return (
    <form action={action} className="space-y-5">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {state && !state.ok ? <Alert variant="error" title="Could not save">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tournament name" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            required
            minLength={4}
            maxLength={90}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            placeholder="Free Fire Weekday Clash"
          />
        </Field>
        <Field label="Slug" htmlFor="slug" hint="Used in the public URL" required>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="free-fire-weekday-clash"
          />
        </Field>
        <Field label="Game" htmlFor="game_id" required>
          <Select id="game_id" name="game_id" defaultValue={values.game_id ?? ""} required>
            <option value="">Select game…</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mode" htmlFor="mode" required>
          <Select id="mode" name="mode" defaultValue={values.mode ?? "squad"} required>
            {MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </Select>
        </Field>
        <Field label="Format" htmlFor="format" required>
          <Select id="format" name="format" defaultValue={values.format ?? "single_elimination"} required>
            {FORMATS.map((format) => (
              <option key={format} value={format}>{format.replace(/_/g, " ")}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={values.status ?? "draft"} required>
            {["draft", "published", "registration_open", "registration_closed", "live", "completed", "cancelled"].map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Entry fee (₹)" htmlFor="entry_fee">
          <Input id="entry_fee" name="entry_fee" type="number" min={0} step="0.01" defaultValue={values.entry_fee ?? 0} />
        </Field>
        <Field label="Prize pool (₹)" htmlFor="prize_pool">
          <Input id="prize_pool" name="prize_pool" type="number" min={0} step="0.01" defaultValue={values.prize_pool ?? 0} />
        </Field>
        <Field label="Max slots" htmlFor="max_slots" required>
          <Input id="max_slots" name="max_slots" type="number" min={2} max={4096} defaultValue={values.max_slots ?? 64} required />
        </Field>
        <Field label="Banner image URL" htmlFor="banner_url">
          <Input id="banner_url" name="banner_url" defaultValue={values.banner_url ?? ""} placeholder="/brand/tournament-ff.svg" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Min team size" htmlFor="min_team_size" required>
          <Input id="min_team_size" name="min_team_size" type="number" min={1} max={8} defaultValue={values.min_team_size ?? 4} required />
        </Field>
        <Field label="Max team size" htmlFor="max_team_size" required>
          <Input id="max_team_size" name="max_team_size" type="number" min={1} max={8} defaultValue={values.max_team_size ?? 4} required />
        </Field>
        <Field label="Scoring rule" htmlFor="scoring_rule_id">
          <Select id="scoring_rule_id" name="scoring_rule_id" defaultValue={values.scoring_rule_id ?? ""}>
            <option value="">Platform default</option>
            {scoringRules.map((rule) => (
              <option key={rule.id} value={rule.id}>{rule.name}{rule.is_default ? " (default)" : ""}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Registration opens" htmlFor="registration_starts_at">
          <Input id="registration_starts_at" name="registration_starts_at" type="datetime-local" defaultValue={values.registration_starts_at ?? ""} />
        </Field>
        <Field label="Registration deadline" htmlFor="registration_ends_at">
          <Input id="registration_ends_at" name="registration_ends_at" type="datetime-local" defaultValue={values.registration_ends_at ?? ""} />
        </Field>
        <Field label="Tournament starts" htmlFor="starts_at" required>
          <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={values.starts_at ?? ""} required />
        </Field>
        <Field label="Tournament ends" htmlFor="ends_at">
          <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={values.ends_at ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="1st prize (₹)" htmlFor="prize_place_1">
          <Input id="prize_place_1" name="prize_place_1" type="number" min={0} defaultValue={values.prize_place_1 ?? 0} />
        </Field>
        <Field label="2nd prize (₹)" htmlFor="prize_place_2">
          <Input id="prize_place_2" name="prize_place_2" type="number" min={0} defaultValue={values.prize_place_2 ?? 0} />
        </Field>
        <Field label="3rd prize (₹)" htmlFor="prize_place_3">
          <Input id="prize_place_3" name="prize_place_3" type="number" min={0} defaultValue={values.prize_place_3 ?? 0} />
        </Field>
      </div>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} defaultValue={values.description ?? ""} placeholder="What players should know before entering." />
      </Field>

      <Field label="Rules & regulations" htmlFor="rules">
        <Textarea id="rules" name="rules" rows={6} defaultValue={values.rules ?? ""} placeholder="1. Squads of four…" />
      </Field>

      <div className="flex flex-wrap gap-5">
        <Checkbox label="Featured on home page" name="is_featured" defaultChecked={values.is_featured ?? false} />
        <Checkbox label="Require admin approval for registrations" name="requires_approval" defaultChecked={values.requires_approval ?? false} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {defaults?.id ? "Save changes" : "Create tournament"}
      </Button>
    </form>
  );
}
