"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useRole } from "@/hooks/use-role";
import { useSearchParams } from "next/navigation";
import { formatAddress, formatEth } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FolderPlus,
  ArrowRight,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useReadContract, useChainId } from "wagmi";
import { ESCROW_ABI, CONTRACT_ADDRESSES, FACTORY_ABI } from "@/lib/contracts";
import { type Address } from "viem";
import { PROJECT_STATUS } from "@/lib/utils";
import { Suspense } from "react";

function ProjectStatusBadge({ status }: { status: number }) {
  const label = PROJECT_STATUS[status as keyof typeof PROJECT_STATUS] ?? "Unknown";
  const variant =
    label === "Active" ? "success" :
    label === "Completed" ? "secondary" :
    label === "Disputed" ? "destructive" :
    "muted";
  return <Badge variant={variant as "success" | "secondary" | "destructive" | "muted"}>{label}</Badge>;
}

function ProjectRow({ address }: { address: Address }) {
  const { data } = useReadContract({
    address,
    abi: ESCROW_ABI,
    functionName: "getProjectDetails",
  });

  if (!data) return <Skeleton className="h-16 w-full rounded-md" />;

  const [client, provider, , totalAmount, releasedAmount, projectStatus] = data;

  return (
    <Link
      href={`/projects/${address}`}
      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-mono font-medium">{formatAddress(address)}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Client: {formatAddress(client)}</span>
          <span>·</span>
          <span>Provider: {formatAddress(provider)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{formatEth(totalAmount)}</p>
          <p className="text-xs text-muted-foreground">{formatEth(releasedAmount)} released</p>
        </div>
        <ProjectStatusBadge status={projectStatus} />
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { address } = useAccount();
  const { role, isLoading, clientProjects, providerProjects } = useRole();
  const searchParams = useSearchParams();
  const view = searchParams.get("role") ?? (role === "provider" ? "provider" : "client");

  const activeProjects =
    view === "provider" ? providerProjects : clientProjects;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <span className="font-mono">{formatAddress(address)}</span>
          </p>
        </div>
        {(role === "client" || role === "both" || role === "none") && (
          <Button asChild>
            <Link href="/projects/new">
              <FolderPlus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard icon={Briefcase} label="Total Projects" value={activeProjects.length} />
        <StatsCard icon={TrendingUp} label="Your Role" value={role === "none" ? "New User" : role} />
        <StatsCard icon={Clock} label="Active" value={activeProjects.length} />
        <StatsCard icon={CheckCircle} label="Network" value="Sepolia" />
      </div>

      <Separator />

      {/* Role toggle tabs */}
      {role === "both" && (
        <div className="flex gap-2">
          <Button
            variant={view === "client" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/dashboard?role=client">As Client</Link>
          </Button>
          <Button
            variant={view === "provider" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/dashboard?role=provider">As Provider</Link>
          </Button>
        </div>
      )}

      {/* Project list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {view === "provider" ? "Contracts (as Provider)" : "Projects (as Client)"}
          </h2>
          <span className="text-sm text-muted-foreground">{activeProjects.length} total</span>
        </div>

        {activeProjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
              <div className="rounded-xl bg-muted p-4 mb-4">
                <FolderPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-base mb-2">No projects yet</CardTitle>
              <CardDescription className="max-w-xs mb-4">
                {view === "client"
                  ? "Create your first milestone-based escrow to get started."
                  : "You haven't been assigned as a service provider on any project yet."}
              </CardDescription>
              {view === "client" && (
                <Button asChild>
                  <Link href="/projects/new">Create Project</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeProjects.map((addr) => (
              <ProjectRow key={addr} address={addr as Address} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
