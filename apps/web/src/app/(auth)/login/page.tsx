import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      eyebrow="Player access"
      title="Enter the arena"
      description="Sign in with your RJNX player account to register for tournaments, manage your squad and track results."
      footer={
        <p>
          New to RJNX?{" "}
          <Link href="/register" className="font-semibold text-rjnx-blue hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-white/5" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
