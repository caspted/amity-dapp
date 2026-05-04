import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// ─── Helpers ────────────────────────────────────────────────────────────────────
async function deployProject(
  client: any,
  provider: any,
  arbiter: any,
  titles: string[],
  amounts: bigint[],
) {
  const Factory = await ethers.getContractFactory("ProjectFactory");
  const factory = await Factory.deploy();
  const total = amounts.reduce((a, b) => a + b, 0n);

  const tx = await factory
    .connect(client)
    .createProject(provider.address, arbiter.address, titles, amounts, {
      value: total,
    });
  const receipt = (await tx.wait())!;
  const events = await factory.queryFilter(
    factory.filters.ProjectCreated(),
    receipt.blockNumber,
  );
  const addr = events[0].args.projectAddress;
  const Escrow = await ethers.getContractFactory("EscrowProject");
  return { escrow: Escrow.attach(addr) as any, factory, projectAddress: addr };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("Advanced Testing Suite — Full Lifecycle & Edge Cases", function () {
  // ── 1. Constructor Validation ─────────────────────────────────────────────
  describe("Constructor Validation", function () {
    it("Should reject zero-address client (factory enforces via msg.sender)", async function () {
      const [, provider, arbiter] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("EscrowProject");
      await expect(
        Escrow.deploy(
          ethers.ZeroAddress,
          provider.address,
          arbiter.address,
          ["Task"],
          [ethers.parseEther("1")],
        ),
      ).to.be.revertedWith("Invalid client");
    });

    it("Should reject zero-address provider", async function () {
      const [client, , arbiter] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("EscrowProject");
      await expect(
        Escrow.deploy(
          client.address,
          ethers.ZeroAddress,
          arbiter.address,
          ["Task"],
          [ethers.parseEther("1")],
        ),
      ).to.be.revertedWith("Invalid provider");
    });

    it("Should reject zero-address arbiter", async function () {
      const [client, provider] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("EscrowProject");
      await expect(
        Escrow.deploy(
          client.address,
          provider.address,
          ethers.ZeroAddress,
          ["Task"],
          [ethers.parseEther("1")],
        ),
      ).to.be.revertedWith("Invalid arbiter");
    });

    it("Should reject mismatched title/amount arrays", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const Escrow = await ethers.getContractFactory("EscrowProject");
      await expect(
        Escrow.deploy(
          client.address,
          provider.address,
          arbiter.address,
          ["A", "B"],
          [ethers.parseEther("1")],
        ),
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  // ── 2. Factory Edge Cases ─────────────────────────────────────────────────
  describe("ProjectFactory Edge Cases", function () {
    it("Should reject zero-amount milestones", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("ProjectFactory");
      const factory = await Factory.deploy();

      await expect(
        factory
          .connect(client)
          .createProject(
            provider.address,
            arbiter.address,
            ["Free task"],
            [0n],
            { value: 0n },
          ),
      ).to.be.revertedWith("Milestone amount must be > 0");
    });

    it("Should reject empty milestones array", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("ProjectFactory");
      const factory = await Factory.deploy();

      await expect(
        factory
          .connect(client)
          .createProject(provider.address, arbiter.address, [], [], {
            value: 0n,
          }),
      ).to.be.revertedWith("At least one milestone required");
    });

    it("Should track multiple projects per client", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("ProjectFactory");
      const factory = await Factory.deploy();

      await factory
        .connect(client)
        .createProject(
          provider.address,
          arbiter.address,
          ["A"],
          [ethers.parseEther("1")],
          { value: ethers.parseEther("1") },
        );
      await factory
        .connect(client)
        .createProject(
          provider.address,
          arbiter.address,
          ["B"],
          [ethers.parseEther("2")],
          { value: ethers.parseEther("2") },
        );

      const projects = await factory.getProjectsByClient(client.address);
      expect(projects.length).to.equal(2);
      expect(await factory.getProjectsCount()).to.equal(2);
    });

    it("Should emit ProjectCreated with correct args", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("ProjectFactory");
      const factory = await Factory.deploy();
      const amount = ethers.parseEther("5");

      await expect(
        factory
          .connect(client)
          .createProject(
            provider.address,
            arbiter.address,
            ["Task"],
            [amount],
            { value: amount },
          ),
      )
        .to.emit(factory, "ProjectCreated")
        .withArgs(client.address, provider.address, () => true, amount);
    });
  });

  // ── 3. Boundary Conditions ────────────────────────────────────────────────
  describe("Boundary Conditions", function () {
    it("Should revert on out-of-bounds milestone index for markComplete", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Only"],
        [ethers.parseEther("10")],
      );

      await expect(
        escrow.connect(provider).markMilestoneComplete(99),
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneIndex");
    });

    it("Should revert on out-of-bounds milestone index for approveMilestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Only"],
        [ethers.parseEther("10")],
      );

      await expect(
        escrow.connect(client).approveMilestone(5),
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneIndex");
    });

    it("Should revert on out-of-bounds milestone index for raiseDispute", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Only"],
        [ethers.parseEther("10")],
      );

      await expect(
        escrow.connect(client).raiseDispute(5),
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneIndex");
    });
  });

  // ── 4. Event Emission Verification ────────────────────────────────────────
  describe("Event Emission Verification", function () {
    it("Should emit MilestoneSubmitted on markMilestoneComplete", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await expect(escrow.connect(provider).markMilestoneComplete(0))
        .to.emit(escrow, "MilestoneSubmitted")
        .withArgs(0);
    });

    it("Should emit MilestoneApproved on approveMilestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await expect(escrow.connect(client).approveMilestone(0))
        .to.emit(escrow, "MilestoneApproved")
        .withArgs(0);
    });

    it("Should emit RevisionRequested on requestRevision", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await expect(escrow.connect(client).requestRevision(0))
        .to.emit(escrow, "RevisionRequested")
        .withArgs(0);
    });

    it("Should emit MilestoneRetried on retryMilestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).requestRevision(0);
      await expect(escrow.connect(provider).retryMilestone(0))
        .to.emit(escrow, "MilestoneRetried")
        .withArgs(0);
    });

    it("Should emit FundsWithdrawn on withdrawFunds", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);
      await expect(escrow.connect(provider).withdrawFunds())
        .to.emit(escrow, "FundsWithdrawn")
        .withArgs(ethers.parseEther("10"));
    });
  });

  // ── 5. Enhanced Dispute Governance ────────────────────────────────────────
  describe("Enhanced Dispute Governance", function () {
    it("Should emit DisputeRaised with deadline", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await expect(escrow.connect(client).raiseDispute(0)).to.emit(
        escrow,
        "DisputeRaised",
      );
    });

    it("Should set disputeDeadline 7 days from now", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      const deadline = await escrow.disputeDeadline();
      expect(deadline).to.be.greaterThan(0);
    });

    it("Should prevent re-disputing an already disputed milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      await expect(
        escrow.connect(provider).raiseDispute(0),
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });

    it("Should prevent disputing a Released milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);
      await escrow.connect(provider).withdrawFunds();

      await expect(
        escrow.connect(client).raiseDispute(0),
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });

    it("Should allow arbiter to resolve with split (50/50)", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const milestoneAmt = ethers.parseEther("100");
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [milestoneAmt],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      const half = ethers.parseEther("50");
      const clientBefore = await ethers.provider.getBalance(client.address);
      const providerBefore = await ethers.provider.getBalance(provider.address);

      await escrow
        .connect(arbiter)
        .resolveDisputeWithSplit(0, half, half);

      const clientAfter = await ethers.provider.getBalance(client.address);
      const providerAfter = await ethers.provider.getBalance(provider.address);

      expect(clientAfter - clientBefore).to.equal(half);
      expect(providerAfter - providerBefore).to.equal(half);
      expect(await escrow.disputeActive()).to.be.false;
    });

    it("Should allow arbiter to award 100% to client via split", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const milestoneAmt = ethers.parseEther("50");
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [milestoneAmt],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      const clientBefore = await ethers.provider.getBalance(client.address);
      await escrow
        .connect(arbiter)
        .resolveDisputeWithSplit(0, milestoneAmt, 0n);

      const clientAfter = await ethers.provider.getBalance(client.address);
      expect(clientAfter - clientBefore).to.equal(milestoneAmt);
    });

    it("Should reject split amounts that don't sum to milestone amount", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("100")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      await expect(
        escrow
          .connect(arbiter)
          .resolveDisputeWithSplit(
            0,
            ethers.parseEther("30"),
            ethers.parseEther("30"),
          ),
      ).to.be.revertedWithCustomError(escrow, "InvalidSplitAmounts");
    });

    it("Should reject resolveDispute when no dispute is active", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await expect(
        escrow
          .connect(arbiter)
          .resolveDispute(0, client.address, ethers.parseEther("10")),
      ).to.be.revertedWithCustomError(escrow, "DisputeNotActive");
    });

    it("Should allow evidence submission during dispute", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      await expect(
        escrow
          .connect(client)
          .submitEvidence(0, "ipfs://QmClientEvidence123"),
      )
        .to.emit(escrow, "EvidenceSubmitted")
        .withArgs(0, client.address, "ipfs://QmClientEvidence123");

      await expect(
        escrow
          .connect(provider)
          .submitEvidence(0, "ipfs://QmProviderEvidence456"),
      )
        .to.emit(escrow, "EvidenceSubmitted")
        .withArgs(0, provider.address, "ipfs://QmProviderEvidence456");
    });

    it("Should reject evidence on non-disputed milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await expect(
        escrow.connect(client).submitEvidence(0, "ipfs://evidence"),
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });

    it("Should reject evidence from unauthorized address", async function () {
      const [client, provider, arbiter, stranger] =
        await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      await expect(
        escrow.connect(stranger).submitEvidence(0, "ipfs://evidence"),
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });
  });

  // ── 6. Dispute Timeout ────────────────────────────────────────────────────
  describe("Dispute Timeout Mechanism", function () {
    it("Should reject timeout claim before deadline", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      await expect(
        escrow.connect(client).claimDisputeTimeout(0),
      ).to.be.revertedWithCustomError(escrow, "DeadlineNotReached");
    });

    it("Should allow client to claim timeout refund after deadline", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const milestoneAmt = ethers.parseEther("10");
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [milestoneAmt],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      // Fast-forward 7 days + 1 second
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      const before = await ethers.provider.getBalance(client.address);
      const tx = await escrow.connect(client).claimDisputeTimeout(0);
      const receipt = await tx.wait();
      const gas = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);
      const after = await ethers.provider.getBalance(client.address);

      expect(after - before + gas).to.equal(milestoneAmt);
      expect(await escrow.disputeActive()).to.be.false;
    });

    it("Should reject timeout claim from provider", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        escrow.connect(provider).claimDisputeTimeout(0),
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });
  });

  // ── 7. Full Project Lifecycle ─────────────────────────────────────────────
  describe("Full Project Lifecycle (E2E)", function () {
    it("Should complete full lifecycle: create → submit → approve/dispute → resolve → withdraw", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("30"),
        ethers.parseEther("20"),
      ];
      const { escrow, projectAddress } = await deployProject(
        client,
        provider,
        arbiter,
        ["Design", "Build", "QA"],
        amounts,
      );

      // Verify deposit
      expect(await ethers.provider.getBalance(projectAddress)).to.equal(
        ethers.parseEther("100"),
      );

      // Phase 1: Submit + approve milestone 0
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Phase 2: Submit milestone 1, client disputes
      await escrow.connect(provider).markMilestoneComplete(1);
      await escrow.connect(client).raiseDispute(1);

      // Evidence phase
      await escrow
        .connect(client)
        .submitEvidence(1, "ipfs://clientProof");
      await escrow
        .connect(provider)
        .submitEvidence(1, "ipfs://providerProof");

      // Arbiter splits 30 ETH: 20 to provider, 10 back to client
      await escrow
        .connect(arbiter)
        .resolveDisputeWithSplit(
          1,
          ethers.parseEther("10"),
          ethers.parseEther("20"),
        );

      // Phase 3: Submit + approve milestone 2
      await escrow.connect(provider).markMilestoneComplete(2);
      await escrow.connect(client).approveMilestone(2);

      // Withdraw remaining approved funds (milestone 0 + milestone 2 = 50 + 20)
      await escrow.connect(provider).withdrawFunds();

      // All milestones should be Released
      const milestones = await escrow.getMilestones();
      for (const m of milestones) {
        expect(m.status).to.equal(5); // Released
      }

      // Contract should have 0 balance
      expect(await ethers.provider.getBalance(projectAddress)).to.equal(0);
    });
  });

  // ── 8. Sequential Withdrawals ─────────────────────────────────────────────
  describe("Sequential Withdrawals", function () {
    it("Should handle multiple partial withdrawals correctly", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow, projectAddress } = await deployProject(
        client,
        provider,
        arbiter,
        ["A", "B", "C"],
        [
          ethers.parseEther("10"),
          ethers.parseEther("20"),
          ethers.parseEther("30"),
        ],
      );

      // Approve and withdraw milestone A
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);
      await escrow.connect(provider).withdrawFunds();
      expect(await escrow.releasedAmount()).to.equal(ethers.parseEther("10"));
      expect(await ethers.provider.getBalance(projectAddress)).to.equal(
        ethers.parseEther("50"),
      );

      // Approve and withdraw milestone B
      await escrow.connect(provider).markMilestoneComplete(1);
      await escrow.connect(client).approveMilestone(1);
      await escrow.connect(provider).withdrawFunds();
      expect(await escrow.releasedAmount()).to.equal(ethers.parseEther("30"));

      // Approve and withdraw milestone C
      await escrow.connect(provider).markMilestoneComplete(2);
      await escrow.connect(client).approveMilestone(2);
      await escrow.connect(provider).withdrawFunds();
      expect(await escrow.releasedAmount()).to.equal(ethers.parseEther("60"));
      expect(await ethers.provider.getBalance(projectAddress)).to.equal(0);
    });

    it("Should reject double withdrawal (no approved milestones)", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);
      await escrow.connect(provider).withdrawFunds();

      // Second withdrawal should fail — no approved milestones left
      await expect(
        escrow.connect(provider).withdrawFunds(),
      ).to.be.revertedWithCustomError(escrow, "InsufficientBalance");
    });
  });

  // ── 9. Revision Cycle Stress ──────────────────────────────────────────────
  describe("Revision Cycles", function () {
    it("Should handle 3 revision cycles then approve", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Iterative Task"],
        [ethers.parseEther("10")],
      );

      for (let i = 0; i < 3; i++) {
        await escrow.connect(provider).markMilestoneComplete(0);
        await escrow.connect(client).requestRevision(0);
        await escrow.connect(provider).retryMilestone(0);
      }

      // Final submit + approve
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      const m = (await escrow.getMilestones())[0];
      expect(m.status).to.equal(2); // Approved
    });
  });

  // ── 10. Unauthorized Access ───────────────────────────────────────────────
  describe("Unauthorized Access Guards", function () {
    it("Should prevent stranger from raising dispute", async function () {
      const [client, provider, arbiter, stranger] =
        await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await expect(
        escrow.connect(stranger).raiseDispute(0),
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should prevent stranger from calling retryMilestone", async function () {
      const [client, provider, arbiter, stranger] =
        await ethers.getSigners();
      const { escrow } = await deployProject(
        client,
        provider,
        arbiter,
        ["Task"],
        [ethers.parseEther("10")],
      );

      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).requestRevision(0);

      await expect(
        escrow.connect(stranger).retryMilestone(0),
      ).to.be.revertedWithCustomError(
        escrow,
        "AccessControlUnauthorizedAccount",
      );
    });
  });
});
