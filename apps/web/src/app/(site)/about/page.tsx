import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Gamepad2, ShieldCheck, Sparkles, Target, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";
import { BRAND } from "@rjnx/shared";

export const metadata: Metadata = {
  title: "About RJNX",
  description: "RJNX GAMING ESPORTS is a competitive esports platform built for Indian players — verified results, real leaderboards, zero fake lobbies.",
};

const VALUES = [
  { icon: <ShieldCheck className="size-5" />, title: "Verified results", copy: "Every listed result is reviewed by a tournament manager before points are awarded." },
  { icon: <Zap className="size-5" />, title: "Fast operations", copy: "Room credentials, schedules and brackets are published on time, every time." },
  { icon: <Users className="size-5" />, title: "Player first", copy: "Slot limits, waitlists and approvals exist so lobbies are fair and full." },
  { icon: <Target className="size-5" />, title: "Transparent scoring", copy: "Placement points, kill points and tie-breakers are published per tournament." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-rjnx-blue/20 bg-gradient-to-br from-rjnx-purple/15 via-rjnx-surface to-rjnx-blue/10 p-8 sm:p-12">
        <div className="scanline pointer-events-none absolute inset-0 opacity-25" />
        <Badge tone="pink">Est. 2023 · Guwahati, Assam</Badge>
        <h1 className="mt-3 font-display text-3xl font-black uppercase leading-tight tracking-[0.02em] text-white sm:text-4xl">
          Built for players who refuse to be average
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          {BRAND.name} runs competitive mobile and PC esports tournaments across India. We built our own
          platform — brackets, room distribution, result verification and leaderboards — so nothing about
          your tournament depends on a spreadsheet or a WhatsApp group.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/tournaments">
            <Button shape="hud">Browse tournaments</Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary" shape="hud">Partner with us</Button>
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading eyebrow="How we operate" title="Non-negotiables" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {VALUES.map((value) => (
            <Card key={value.title} className="p-5">
              <div className="flex items-center gap-2 text-rjnx-blue">{value.icon}<span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white">{value.title}</span></div>
              <p className="mt-2 text-sm text-white/55">{value.copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <Gamepad2 className="mx-auto size-5 text-rjnx-purple" />
          <p className="mt-2 font-display text-2xl font-black text-white">8</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Titles supported</p>
        </Card>
        <Card className="p-5 text-center">
          <Sparkles className="mx-auto size-5 text-rjnx-pink" />
          <p className="mt-2 font-display text-2xl font-black text-white">Weekly</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Tournament cadence</p>
        </Card>
        <Card className="p-5 text-center">
          <Flag className="mx-auto size-5 text-rjnx-blue" />
          <p className="mt-2 font-display text-2xl font-black text-white">India</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Player base</p>
        </Card>
      </section>

      <section className="mt-10">
        <Card className="p-6">
          <h2 className="font-display text-sm font-black uppercase tracking-[0.14em] text-white">The team</h2>
          <p className="mt-2 text-sm text-white/55">
            RJNX is designed, engineered and operated by <span className="font-semibold text-rjnx-pink">DEVKAZZU</span>{" "}
            with a volunteer crew of tournament managers and moderators who run lobbies, verify results and
            keep the bracket honest.
          </p>
          <p className="mt-3 font-display text-[10px] uppercase tracking-[0.3em] text-rjnx-blue">{BRAND.tagline}</p>
        </Card>
      </section>
    </div>
  );
}
