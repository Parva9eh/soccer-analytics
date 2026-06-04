import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse rounded-xl bg-muted/40" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}