"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useRole } from "@/hooks/use-role";
import { useMounted } from "@/hooks/use-mounted";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAccount();
  const router = useRouter();
  const { role } = useRole();
  const mounted = useMounted();

  useEffect(() => {
    if (mounted && status === "disconnected") router.push("/");
  }, [mounted, status, router]);

  if (!mounted || status === "reconnecting" || status === "connecting") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "disconnected") return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex h-full">
          <Sidebar role={role} />
        </div>
        <main className="motion-fade-in flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
