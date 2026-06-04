import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="content flex min-h-[70vh] flex-col items-center justify-center py-12">
      <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse rounded-xl bg-muted/40" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}