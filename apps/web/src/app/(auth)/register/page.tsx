import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      eyebrow="New challenger"
      title="Join RJNX"
      description="Create your player account. You'll get a profile, team tools, and access to every open tournament."
      footer={
        <p>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-rjnx-blue hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-white/5" />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
