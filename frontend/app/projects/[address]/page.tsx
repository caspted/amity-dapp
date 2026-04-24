"use client";

import { use } from "react";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  useProjectDetails,
  useMilestones,
  useMarkComplete,
  useApprove,
  useRequestRevision,
  useRaiseDispute,
  useWithdrawFunds,
} from "@/hooks/use-escrow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { formatAddress, formatEth, MILESTONE_STATUS, PROJECT_STATUS } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ─── Status helpers ────────────────────────────────────────────────────────────

function milestoneBadgeVariant(status: number) {
  switch (status) {
    case 0: return "muted";
    case 1: return "warning";
    case 2: return "success";
    case 3: return "default";
    case 4: return "destructive";
    default: return "muted";
  }
}

function projectBadgeVariant(status: number) {
  switch (status) {
    case 0: return "success";
    case 1: return "destructive";
    case 2: return "secondary";
    default: return "muted";
  }
}

// ─── Milestone Card ────────────────────────────────────────────────────────────

interface MilestoneCardProps {
  index: number;
  title: string;
  amount: bigint;
  status: number;
  isClient: boolean;
  isProvider: boolean;
  projectAddress: Address;
  projectActive: boolean;
}

function MilestoneCard({
  index,
  title,
  amount,
  status,
  isClient,
  isProvider,
  projectAddress,
  projectActive,
}: MilestoneCardProps) {
  const idx = BigInt(index);
  const { execute: markComplete, isLoading: markLoading } = useMarkComplete(projectAddress);
  const { execute: approve, isLoading: approveLoading } = useApprove(projectAddress);
  const { execute: requestRevision, isLoading: revisionLoading } = useRequestRevision(projectAddress);
  const { execute: raiseDispute, isLoading: disputeLoading } = useRaiseDispute(projectAddress);

  const statusLabel = MILESTONE_STATUS[status as keyof typeof MILESTONE_STATUS] ?? "Unknown";
  const badgeVariant = milestoneBadgeVariant(status);
  const isAnyLoading = markLoading || approveLoading || revisionLoading || disputeLoading;

  const iconMap: Record<string, React.ReactNode> = {
    Pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    Submitted: <Clock className="h-4 w-4 text-warning" />,
    Approved: <CheckCircle className="h-4 w-4 text-success" />,
    Revision: <RotateCcw className="h-4 w-4 text-primary" />,
    Disputed: <AlertTriangle className="h-4 w-4 text-destructive" />,
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
            {index + 1}
          </span>
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{formatEth(amount)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {iconMap[statusLabel]}
          <Badge variant={badgeVariant as "muted" | "warning" | "success" | "default" | "destructive"}>
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* Actions — only shown when project is Active */}
      {projectActive && (
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Provider: mark complete when Pending or Revision */}
          {isProvider && (status === 0 || status === 3) && (
            <Button
              size="sm"
              variant="outline"
              isLoading={markLoading}
              disabled={isAnyLoading}
              onClick={() => markComplete(idx)}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark Complete
            </Button>
          )}

          {/* Client: approve or request revision when Submitted */}
          {isClient && status === 1 && (
            <>
              <Button
                size="sm"
                variant="success"
                isLoading={approveLoading}
                disabled={isAnyLoading}
                onClick={() => approve(idx)}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve &amp; Release
              </Button>
              <Button
                size="sm"
                variant="outline"
                isLoading={revisionLoading}
                disabled={isAnyLoading}
                onClick={() => requestRevision(idx)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Request Revision
              </Button>
            </>
          )}

          {/* Either party: raise dispute when Submitted */}
          {(isClient || isProvider) && status === 1 && (
            <Button
              size="sm"
              variant="destructive"
              isLoading={disputeLoading}
              disabled={isAnyLoading}
              onClick={() => raiseDispute(idx)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Raise Dispute
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ released, total }: { released: bigint; total: bigint }) {
  const pct = total > 0n ? Number((released * 100n) / total) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatEth(released)} released</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">{formatEth(total)} total</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: resolvedAddress } = use(params);
  const projectAddress = resolvedAddress as Address;
  const { address: userAddress } = useAccount();

  const { data: details, isLoading: detailsLoading } = useProjectDetails(projectAddress);
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(projectAddress);
  const { execute: withdraw, isLoading: withdrawLoading } = useWithdrawFunds(projectAddress);

  const isLoading = detailsLoading || milestonesLoading;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-2xl mx-auto pt-10 text-center">
        <p className="text-muted-foreground">Project not found or not accessible.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const [client, provider, arbiter, totalAmount, releasedAmount, projectStatus] = details;

  const isClient = userAddress?.toLowerCase() === client.toLowerCase();
  const isProvider = userAddress?.toLowerCase() === provider.toLowerCase();
  const projectActive = projectStatus === 0;

  const approvedCount = (milestones ?? []).filter((m) => m.status === 2).length;

  const projectStatusLabel = PROJECT_STATUS[projectStatus as keyof typeof PROJECT_STATUS] ?? "Unknown";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-mono truncate">{formatAddress(projectAddress)}</h1>
            <Badge variant={projectBadgeVariant(projectStatus) as "success" | "destructive" | "secondary" | "muted"}>
              {projectStatusLabel}
            </Badge>
            {isClient && <Badge variant="outline">You are Client</Badge>}
            {isProvider && <Badge variant="outline">You are Provider</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{projectAddress}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(projectAddress);
            toast({ title: "Address copied!", variant: "default" });
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar released={releasedAmount} total={totalAmount} />

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Client</p>
              <p className="font-mono">{formatAddress(client)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Provider</p>
              <p className="font-mono">{formatAddress(provider)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Arbiter</p>
              <p className="font-mono">{formatAddress(arbiter)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Milestones</p>
              <p>
                {approvedCount} / {(milestones ?? []).length} approved
              </p>
            </div>
          </div>

          {/* Provider withdraw */}
          {isProvider && approvedCount > 0 && (
            <>
              <Separator />
              <Button
                variant="success"
                className="w-full"
                isLoading={withdrawLoading}
                onClick={withdraw}
              >
                <Download className="h-4 w-4" />
                Withdraw Approved Funds
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Milestones</h2>
          <span className="text-sm text-muted-foreground">
            {(milestones ?? []).length} total
          </span>
        </div>

        {(milestones ?? []).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <CardDescription>No milestones found for this project.</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-stagger>
            {(milestones ?? []).map((m, idx) => (
              <MilestoneCard
                key={idx}
                index={idx}
                title={m.title}
                amount={m.amount}
                status={m.status}
                isClient={isClient}
                isProvider={isProvider}
                projectAddress={projectAddress}
                projectActive={projectActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dispute notice */}
      {projectStatus === 1 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-destructive">Dispute Active</p>
              <p className="text-sm text-muted-foreground mt-1">
                This project is under dispute. The arbiter ({formatAddress(arbiter)}) will
                review the situation and make a ruling. Remaining funds are locked until resolved.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
