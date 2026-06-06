"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  label?: string;
}

export function SignOutButton({ label = "Sign out" }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground"
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}