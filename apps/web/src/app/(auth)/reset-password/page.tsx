import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="New password"
      description="Pick a strong password. You'll use it the next time you sign in."
      footer={
        <p>
          <Link href="/login" className="font-semibold text-rjnx-blue hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
