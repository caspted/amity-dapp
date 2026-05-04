"use client";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { WrongNetworkBanner } from "@/components/layout/wrong-network-banner";
import { Toaster } from "@/components/ui/toaster";
import { MetaMaskGate } from "@/components/auth/metamask-gate";
import { useWalletEvents } from "@/hooks/use-wallet-events";

function ShellContent({ children }: { children: React.ReactNode }) {
  useWalletEvents();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <WrongNetworkBanner />
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>
        <main className="motion-fade-in flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MetaMaskGate>
      <ShellContent>{children}</ShellContent>
    </MetaMaskGate>
  );
}