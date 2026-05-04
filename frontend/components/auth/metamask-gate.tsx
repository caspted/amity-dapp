"use client";

import { useAccount } from "wagmi";
import { Loader2, ExternalLink, Shield, Wallet } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMetaMask } from "@/hooks/use-metamask";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const METAMASK_DOWNLOAD_URL = "https://metamask.io/download/";

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}

function HydrationLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

export function MetaMaskGate({ children }: { children: React.ReactNode }) {
  const { mounted, isInstalled, isConnecting, connect, error } = useMetaMask();
  const { isConnected, status } = useAccount();

  if (!mounted || status === "reconnecting" || status === "connecting") {
    return <HydrationLoader />;
  }

  if (!isInstalled) {
    return (
      <CenteredCard>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-xl bg-warning/10 p-3 w-fit">
            <Shield className="h-6 w-6 text-warning" />
          </div>
          <CardTitle>MetaMask Not Detected</CardTitle>
          <CardDescription>
            Amity uses MetaMask to sign transactions and interact with the escrow
            contracts. Install the extension to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <a href={METAMASK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Install MetaMask
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            After installing, refresh this page.
          </p>
        </CardContent>
      </CenteredCard>
    );
  }

  if (!isConnected) {
    return (
      <CenteredCard>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-xl bg-primary/10 p-3 w-fit">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Connect Your Wallet</CardTitle>
          <CardDescription>
            Connect a wallet to view your escrow projects and milestones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            isLoading={isConnecting}
            disabled={isConnecting}
            onClick={connect}
          >
            {isConnecting ? "Confirming in MetaMask…" : "Connect MetaMask"}
          </Button>
          <div className="flex justify-center">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Use a different wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
          {error && (
            <p className="text-center text-xs text-destructive">
              {error.message.slice(0, 120)}
            </p>
          )}
        </CardContent>
      </CenteredCard>
    );
  }

  return <>{children}</>;
}
