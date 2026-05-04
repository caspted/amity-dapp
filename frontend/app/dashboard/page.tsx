"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useRole } from "@/hooks/use-role";
import { useSearchParams } from "next/navigation";
import { formatAddress, formatEth, deriveProjectStatus } from "@/lib/utils";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useReadContract } from "wagmi";
import { ESCROW_ABI } from "@/lib/contracts";
import { type Address } from "viem";
import { PROJECT_STATUS } from "@/lib/utils";
import { Suspense, useState } from "react";
import { getProjectTitle } from "@/lib/project-titles";

function ProjectStatusBadge({ status }: { status: number }) {
  const label = PROJECT_STATUS[status as keyof typeof PROJECT_STATUS] ?? "Unknown";
  const variant =
    label === "Active" ? "success" :
    label === "Completed" ? "secondary" :
    label === "Disputed" ? "destructive" :
    "muted";
  return <Badge variant={variant as "success" | "secondary" | "destructive" | "muted"}>{label}</Badge>;
}

function RoleBadge({ role }: { role: "client" | "provider" | "arbiter" }) {
  if (role === "client") {
    return <Badge variant="success">Client</Badge>;
  }
  if (role === "provider") {
    return <Badge variant="secondary">Provider</Badge>;
  }
  return (
    <Badge className="border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
      Arbiter
    </Badge>
  );
}

function ProjectRow({
  address,
  userAddress,
}: {
  address: Address;
  userAddress?: Address;
}) {
  const { data } = useReadContract({
    address,
    abi: ESCROW_ABI,
    functionName: "getProjectDetails",
  });

  const [title] = useState<string | null>(() => getProjectTitle(address));

  const { data: milestones } = useReadContract({
    address,
    abi: ESCROW_ABI,
    functionName: "getMilestones",
    query: { enabled: title === null && !!address },
  });

  const displayTitle = title ?? (milestones?.[0]?.title?.split("\n")[0] ?? null);

  if (!data) return <Skeleton className="h-16 w-full rounded-md" />;

  const [client, provider, arbiter, totalAmount, releasedAmount, disputeActive] = data;
  const projectStatus = deriveProjectStatus(disputeActive, releasedAmount, totalAmount);

  const userRole =
    userAddress?.toLowerCase() === client.toLowerCase() ? "client" :
    userAddress?.toLowerCase() === provider.toLowerCase() ? "provider" :
    userAddress?.toLowerCase() === arbiter.toLowerCase() ? "arbiter" :
    null;

  return (
    <Link
      href={`/projects/${address}`}
      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors group"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {displayTitle ? (
            <>{displayTitle} <span className="font-mono font-normal text-muted-foreground">({formatAddress(address)})</span></>
          ) : (
            <span className="font-mono">{formatAddress(address)}</span>
          )}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Client: {formatAddress(client)}</span>
          <span>·</span>
          <span>Provider: {formatAddress(provider)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{formatEth(totalAmount)}</p>
          <p className="text-xs text-muted-foreground">{formatEth(releasedAmount)} released</p>
        </div>
        {userRole && <RoleBadge role={userRole} />}
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
  const {
    role,
    isClient,
    isProvider,
    isArbiter,
    isLoading,
    clientProjects,
    providerProjects,
    arbiterProjects,
  } = useRole();
  const searchParams = useSearchParams();

  const defaultView =
    role === "provider" && !isClient ? "provider" :
    isArbiter && !isClient && !isProvider ? "arbiter" :
    "client";
  const view = searchParams.get("view") ?? defaultView;

  const activeProjects =
    view === "provider" ? providerProjects :
    view === "arbiter" ? arbiterProjects :
    clientProjects;

  const roleLabel =
    [isClient && "Client", isProvider && "Provider", isArbiter && "Arbiter"]
      .filter(Boolean)
      .join(" · ") || "New User";

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
        <Button asChild>
          <Link href="/projects/new">
            <FolderPlus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard icon={Briefcase} label="Total Projects" value={activeProjects.length} />
        <StatsCard icon={TrendingUp} label="Your Role" value={roleLabel} />
        <StatsCard icon={Clock} label="Active" value={activeProjects.length} />
        <StatsCard icon={CheckCircle} label="Network" value="Sepolia" />
      </div>

      <Separator />

      {/* Role tab switcher */}
      {(isClient || isProvider || isArbiter) && (
        <div className="flex gap-2 flex-wrap">
          {isClient && (
            <Button
              variant={view === "client" ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href="/dashboard?view=client">
                Client ({clientProjects.length})
              </Link>
            </Button>
          )}
          {isProvider && (
            <Button
              variant={view === "provider" ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href="/dashboard?view=provider">
                Provider ({providerProjects.length})
              </Link>
            </Button>
          )}
          {isArbiter && (
            <Button
              variant={view === "arbiter" ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href="/dashboard?view=arbiter">
                Arbiter ({arbiterProjects.length})
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Project list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {view === "provider"
              ? "Contracts (as Provider)"
              : view === "arbiter"
              ? "Projects (as Arbiter)"
              : "Projects (as Client)"}
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
                {view === "arbiter"
                  ? "You haven't been assigned as arbiter on any project yet."
                  : view === "provider"
                  ? "You haven't been assigned as a service provider on any project yet."
                  : "Create your first milestone-based escrow to get started."}
              </CardDescription>
              {view !== "arbiter" && view !== "provider" && (
                <Button asChild>
                  <Link href="/projects/new">Create Project</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" data-stagger>
            {activeProjects.map((addr) => (
              <ProjectRow key={addr} address={addr as Address} userAddress={address} />
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