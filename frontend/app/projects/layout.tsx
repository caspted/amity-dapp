"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useRole } from "@/hooks/use-role";
import { Loader2 } from "lucide-react";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { role } = useRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected) router.push("/");
  }, [mounted, isConnected, router]);

  // During SSR and initial hydration: identical output → no mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConnected) return null;

  const sidebarRole = role === "provider" ? "provider" : "client";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex h-full">
          <Sidebar role={sidebarRole} />
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
