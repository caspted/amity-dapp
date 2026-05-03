"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther, type Address } from "viem";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, AlertCircle } from "lucide-react";
import { CONTRACT_ADDRESSES, FACTORY_ABI } from "@/lib/contracts";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MilestoneField {
  id: string;
  title: string;
  amount: string;
}

function newMilestone(): MilestoneField {
  return { id: Math.random().toString(36).slice(2), title: "", amount: "" };
}

export default function NewProjectPage() {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const factoryAddress = CONTRACT_ADDRESSES[chainId]?.factory as Address | undefined;

  const [provider, setProvider] = useState("");
  const [arbiter, setArbiter] = useState("");
  const [milestones, setMilestones] = useState<MilestoneField[]>([newMilestone()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isLoading = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      toast({ title: "Project deployed successfully!", variant: "success" });
      router.push("/dashboard");
    }
  }, [isSuccess, queryClient, router]);

  const totalEth = milestones.reduce((sum, m) => {
    const n = parseFloat(m.amount) || 0;
    return sum + n;
  }, 0);

  const addMilestone = () => setMilestones((prev) => [...prev, newMilestone()]);

  const removeMilestone = (id: string) =>
    setMilestones((prev) => prev.filter((m) => m.id !== id));

  const updateMilestone = (id: string, field: "title" | "amount", value: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
    setErrors((prev) => ({ ...prev, [`${id}_${field}`]: "" }));
  };

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};

    if (!provider || !/^0x[0-9a-fA-F]{40}$/.test(provider))
      errs.provider = "Valid Ethereum address required";
    if (!arbiter || !/^0x[0-9a-fA-F]{40}$/.test(arbiter))
      errs.arbiter = "Valid Ethereum address required";
    if (provider.toLowerCase() === address?.toLowerCase())
      errs.provider = "Provider cannot be yourself";

    milestones.forEach((m) => {
      if (!m.title.trim()) errs[`${m.id}_title`] = "Title required";
      const n = parseFloat(m.amount);
      if (isNaN(n) || n <= 0) errs[`${m.id}_amount`] = "Amount must be > 0";
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [provider, arbiter, address, milestones]);

  const handleDeploy = async () => {
    if (!validate()) return;
    if (!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") {
      toast({
        title: "Contract Not Deployed",
        description: "ProjectFactory is not deployed on this network yet.",
        variant: "error",
      });
      return;
    }

    try {
      const titles = milestones.map((m) => m.title.trim());
      const amounts = milestones.map((m) => parseEther(m.amount));
      const total = amounts.reduce((a, b) => a + b, 0n);

      await writeContractAsync({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "createProject",
        args: [provider as Address, arbiter as Address, titles, amounts],
        value: total,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deployment failed";
      toast({ title: "Deployment Failed", description: message.slice(0, 100), variant: "error" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Project</h1>
          <p className="text-sm text-muted-foreground">Deploy a new milestone-based escrow contract</p>
        </div>
      </div>

      {/* Parties */}
      <Card>
        <CardHeader>
          <CardTitle>Project Parties</CardTitle>
          <CardDescription>Define the service provider and neutral arbiter for this agreement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="provider">Service Provider Address</Label>
            <Input
              id="provider"
              placeholder="0x..."
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setErrors((p) => ({ ...p, provider: "" }));
              }}
              className={errors.provider ? "border-destructive" : ""}
            />
            {errors.provider && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.provider}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arbiter">Arbiter Address</Label>
            <Input
              id="arbiter"
              placeholder="0x..."
              value={arbiter}
              onChange={(e) => {
                setArbiter(e.target.value);
                setErrors((p) => ({ ...p, arbiter: "" }));
              }}
              className={errors.arbiter ? "border-destructive" : ""}
            />
            {errors.arbiter && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.arbiter}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The arbiter resolves disputes if they arise. Choose a trusted neutral party.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Milestones</CardTitle>
              <CardDescription>Define deliverables and their payment amounts in ETH.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addMilestone}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.map((m, idx) => (
            <div
              key={m.id}
              className="flex gap-3 items-start p-3 rounded-lg border border-border bg-muted/30"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-6">
                    #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <Input
                      placeholder="Milestone title"
                      value={m.title}
                      onChange={(e) => updateMilestone(m.id, "title", e.target.value)}
                      className={`h-8 text-sm ${errors[`${m.id}_title`] ? "border-destructive" : ""}`}
                    />
                    {errors[`${m.id}_title`] && (
                      <p className="text-xs text-destructive mt-1">{errors[`${m.id}_title`]}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <div className="w-36">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="0.000"
                        value={m.amount}
                        onChange={(e) => updateMilestone(m.id, "amount", e.target.value)}
                        className={`h-8 text-sm pr-10 ${errors[`${m.id}_amount`] ? "border-destructive" : ""}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        ETH
                      </span>
                    </div>
                    {errors[`${m.id}_amount`] && (
                      <p className="text-xs text-destructive mt-1">{errors[`${m.id}_amount`]}</p>
                    )}
                  </div>
                </div>
              </div>
              {milestones.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMilestone(m.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary & Deploy */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
            </span>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total to deposit</p>
              <p className="text-xl font-bold">{totalEth.toFixed(4)} ETH</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <p className="text-xs text-muted-foreground mb-4">
            Deploying this project will lock <strong>{totalEth.toFixed(4)} ETH</strong> in
            the escrow contract. Funds are released only upon milestone approval.
          </p>
          <Button
            className="w-full"
            onClick={handleDeploy}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? "Deploying…" : `Deploy & Fund Escrow (${totalEth.toFixed(4)} ETH)`}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
