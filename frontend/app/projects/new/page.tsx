"use client";

import { use, useState } from "react";
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
  Scale,
  FileText,
} from "lucide-react";
import {
  useProjectDetails,
  useMilestones,
  useMarkComplete,
  useApprove,
  useRequestRevision,
  useRaiseDispute,
  useWithdrawFunds,
  useResolveDisputeWithSplit,
  useSubmitEvidence,
  useClaimDisputeTimeout,
  useDisputeDeadline,
} from "@/hooks/use-escrow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { parseEther } from "viem";

import {
  formatAddress,
  formatEth,
  MILESTONE_STATUS,
  PROJECT_STATUS,
  deriveProjectStatus,
} from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { getProjectTitle } from "@/lib/project-titles";

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
  isArbiter: boolean;
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
  isArbiter,
  projectAddress,
  projectActive,
}: MilestoneCardProps) {
  const idx = BigInt(index);
  const { execute: markComplete, isLoading: markLoading } = useMarkComplete(projectAddress);
  const { execute: approve, isLoading: approveLoading } = useApprove(projectAddress);
  const { execute: requestRevision, isLoading: revisionLoading } = useRequestRevision(projectAddress);
  const { execute: raiseDispute, isLoading: disputeLoading } = useRaiseDispute(projectAddress);
  const { execute: resolve, isLoading: resolveLoading } = useResolveDisputeWithSplit(projectAddress);
  const { execute: submitEv, isLoading: evidenceLoading } = useSubmitEvidence(projectAddress);

  const [clientEthStr, setClientEthStr] = useState("");
  const [evidenceURI, setEvidenceURI] = useState("");

  let clientWei: bigint | null = null;
  let providerWei: bigint | null = null;
  let splitError = "";
  let splitValid = false;
  if (clientEthStr.trim() !== "") {
    try {
      const parsed = parseEther(clientEthStr as `${number}`);
      if (parsed < 0n) {
        splitError = "Amount cannot be negative";
      } else if (parsed > amount) {
        splitError = "Exceeds milestone amount";
      } else {
        clientWei = parsed;
        providerWei = amount - parsed;
        splitValid = true;
      }
    } catch {
      splitError = "Invalid amount";
    }
  }

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
            <p className="font-medium text-sm">{title.split("\n")[0]}</p>
            {title.includes("\n") && (
              <p className="text-xs text-muted-foreground mt-0.5">{title.split("\n").slice(1).join("\n")}</p>
            )}
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

      {/* Evidence submission — client or provider on a disputed milestone */}
      {status === 4 && (isClient || isProvider) && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Submit Evidence
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Evidence URL or IPFS hash"
              value={evidenceURI}
              onChange={e => setEvidenceURI(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              isLoading={evidenceLoading}
              disabled={!evidenceURI.trim() || evidenceLoading}
              onClick={() => { submitEv(idx, evidenceURI); setEvidenceURI(""); }}
            >
              Submit
            </Button>
          </div>
        </div>
      )}

      {/* Arbiter resolution panel — only shown during an active dispute */}
      {status === 4 && isArbiter && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" /> Arbiter Resolution
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              isLoading={resolveLoading}
              disabled={resolveLoading}
              onClick={() => resolve(idx, amount, 0n)}
            >
              Award all to Client
            </Button>
            <Button
              size="sm"
              variant="outline"
              isLoading={resolveLoading}
              disabled={resolveLoading}
              onClick={() => resolve(idx, 0n, amount)}
            >
              Award all to Provider
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Custom split (total: {formatEth(amount)})</p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <p className="text-xs">Client receives (ETH)</p>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="0.0"
                  value={clientEthStr}
                  onChange={e => setClientEthStr(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs">Provider receives</p>
                <div className="h-8 flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                  {providerWei !== null ? formatEth(providerWei) : "—"}
                </div>
              </div>
            </div>
            {splitError && <p className="text-xs text-destructive">{splitError}</p>}
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              isLoading={resolveLoading}
              disabled={!splitValid || resolveLoading}
              onClick={() => {
                if (splitValid && clientWei !== null && providerWei !== null)
                  resolve(idx, clientWei, providerWei);
              }}
            >
              <Scale className="h-3.5 w-3.5" />
              Resolve with Custom Split
            </Button>
          </div>
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

  const [projectTitle] = useState<string | null>(() => getProjectTitle(projectAddress));
  const { data: details, isLoading: detailsLoading } = useProjectDetails(projectAddress);
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(projectAddress);
  const { execute: withdraw, isLoading: withdrawLoading } = useWithdrawFunds(projectAddress);
  const { execute: claimTimeout, isLoading: claimLoading } = useClaimDisputeTimeout(projectAddress);
  const { data: disputeDeadline } = useDisputeDeadline(projectAddress);

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

  const [client, provider, arbiter, totalAmount, releasedAmount, disputeActive] = details;
  const projectStatus = deriveProjectStatus(disputeActive, releasedAmount, totalAmount);

  const isClient = userAddress?.toLowerCase() === client.toLowerCase();
  const isProvider = userAddress?.toLowerCase() === provider.toLowerCase();
  const isArbiter = userAddress?.toLowerCase() === arbiter.toLowerCase();
  const projectActive = projectStatus === 0;

  const disputedMilestoneIdx = (milestones ?? []).findIndex(m => m.status === 4);
  const deadlineDate = disputeDeadline ? new Date(Number(disputeDeadline) * 1000) : null;
  const timeoutClaimable = deadlineDate ? Date.now() > deadlineDate.getTime() : false;

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
            <h1 className="text-xl font-bold truncate">
              {projectTitle ? (
                <>{projectTitle} <span className="font-mono font-normal text-muted-foreground">({formatAddress(projectAddress)})</span></>
              ) : (
                <span className="font-mono">{formatAddress(projectAddress)}</span>
              )}
            </h1>
            <Badge variant={projectBadgeVariant(projectStatus) as "success" | "destructive" | "secondary" | "muted"}>
              {projectStatusLabel}
            </Badge>
            {isClient && <Badge variant="outline">You are Client</Badge>}
            {isProvider && <Badge variant="outline">You are Provider</Badge>}
            {isArbiter && <Badge variant="outline">You are Arbiter</Badge>}
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
                isArbiter={isArbiter}
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
            <div className="flex-1 space-y-2">
              <div>
                <p className="font-semibold text-sm text-destructive">Dispute Active</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The arbiter ({formatAddress(arbiter)}) will review and make a ruling.
                  Funds are locked until resolved.
                </p>
                {deadlineDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Resolution deadline: {deadlineDate.toLocaleString()}
                  </p>
                )}
              </div>
              {isClient && timeoutClaimable && disputedMilestoneIdx >= 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  isLoading={claimLoading}
                  disabled={claimLoading}
                  onClick={() => claimTimeout(BigInt(disputedMilestoneIdx))}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Claim Timeout Refund
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}