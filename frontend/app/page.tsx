"use client";

import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shield, Lock, Zap, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";

const features = [
  {
    icon: Lock,
    title: "Trustless Escrow",
    description: "100% of project funds locked in a smart contract. No intermediaries, no custody risk.",
  },
  {
    icon: Zap,
    title: "Milestone Payments",
    description: "Automated releases tied to specific milestones. Pay for exactly what you receive.",
  },
  {
    icon: Users,
    title: "Dispute Resolution",
    description: "A neutral Arbiter role provides decentralized oversight when disagreements arise.",
  },
];

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          <span>Amity</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground mb-6">
          <Shield className="h-3 w-3" />
          Powered by Ethereum Smart Contracts
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          Freelance agreements,{" "}
          <span className="text-primary">enforced on-chain</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          Amity replaces trust with code. Deploy a milestone-based escrow for any
          professional agreement — no platform fees, no chargebacks, no disputes left
          to chance.
        </p>

        <div className="mt-10">
          <ConnectButton label="Connect Wallet to Get Started" />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Connect your wallet to access the dashboard
        </p>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {features.map((f) => (
            <Card key={f.title} className="text-left">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        Amity — Decentralized Milestone Escrow · Built with Next.js &amp; Solidity
      </footer>

      <Toaster />
    </div>
  );
}
