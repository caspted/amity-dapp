import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Task 3: Milestone State Machine & Reentrancy Protection", function () {
  describe("State Transitions - Valid Workflows", function () {
    it("Should transition: Pending → Submitted → Approved → Released", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Complete Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Initial state: Pending (0)
      let milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(0); // Pending

      // Transition 1: Provider marks complete → Submitted (1)
      await escrow.connect(provider).markMilestoneComplete(0);
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(1); // Submitted

      // Transition 2: Client approves → Approved (2)
      await escrow.connect(client).approveMilestone(0);
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(2); // Approved

      // Transition 3: Provider withdraws → Released (5)
      await escrow.connect(provider).withdrawFunds();
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(5); // Released
    });

    it("Should transition: Pending → Submitted → Rejected → Pending (revision)", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task with revision"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Pending → Submitted
      await escrow.connect(provider).markMilestoneComplete(0);
      let milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(1); // Submitted

      // Submitted → Rejected (request revision)
      await escrow.connect(client).requestRevision(0);
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(3); // Rejected

      // Rejected → Pending (provider retries)
      await escrow.connect(provider).retryMilestone(0);
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(0); // Pending (back to Pending)

      // Can mark complete again (cycle repeats)
      await escrow.connect(provider).markMilestoneComplete(0);
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(1); // Submitted (back to Submitted)
    });

    it("Should transition: Submitted → Disputed → Released (arbiter settlement)", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Disputed task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Submitted
      await escrow.connect(provider).markMilestoneComplete(0);
      let milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(1);

      // Submitted → Disputed
      await escrow.connect(client).raiseDispute(0);
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(4); // Disputed

      // Dispute is active
      expect(await escrow.disputeActive()).to.be.true;

      // Arbiter resolves → Released
      await escrow
        .connect(arbiter)
        .resolveDispute(0, client.address, ethers.parseEther("50"));
      milestone = (await escrow.getMilestones())[0];
      expect(milestone.status).to.equal(5); // Released

      // Dispute is no longer active
      expect(await escrow.disputeActive()).to.be.false;
    });
  });

  describe("State Transition Validation - Prevent Invalid Transitions", function () {
    it("Should prevent transition from Pending to Approved directly", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Try to approve before marking complete
      await expect(
        escrow.connect(client).approveMilestone(0)
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });

    it("Should prevent double approval", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // First approval
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Second approval should fail
      await expect(
        escrow.connect(client).approveMilestone(0)
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });

    it("Should prevent revision request on Approved milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Pending → Submitted → Approved
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Try to request revision on Approved
      await expect(
        escrow.connect(client).requestRevision(0)
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });

    it("Should prevent marking complete on non-Pending milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // First mark complete
      await escrow.connect(provider).markMilestoneComplete(0);

      // Try to mark complete again (now it's Submitted, not Pending)
      await expect(
        escrow.connect(provider).markMilestoneComplete(0)
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneStatus");
    });
  });

  describe("Dispute Prevention - Block Operations During Disputes", function () {
    it("Should prevent approval during active dispute", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task 1", "Task 2"];
      const amounts = [ethers.parseEther("50"), ethers.parseEther("50")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Setup: Task 1 submitted and approved, Task 2 submitted
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      await escrow.connect(provider).markMilestoneComplete(1);

      // Raise dispute on Task 2
      await escrow.connect(client).raiseDispute(1);

      // Try to approve Task 2 during dispute (should fail)
      await expect(
        escrow.connect(client).approveMilestone(1)
      ).to.be.revertedWithCustomError(escrow, "DisputeActive");
    });

    it("Should prevent withdrawal during active dispute", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Approve milestone
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Raise dispute
      await escrow.connect(client).raiseDispute(0);

      // Try to withdraw during dispute (should fail)
      await expect(
        escrow.connect(provider).withdrawFunds()
      ).to.be.revertedWithCustomError(escrow, "DisputeActive");
    });
  });

  describe("ReentrancyGuard Protection", function () {
    it("Should protect withdrawFunds from reentrancy", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Approve milestone
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Withdraw should succeed (ReentrancyGuard allows single call)
      const withdrawTx = await escrow.connect(provider).withdrawFunds();
      const withdrawReceipt = await withdrawTx.wait();

      // Verify withdrawal was successful
      expect(withdrawReceipt.status).to.equal(1); // Success

      // Verify funds were transferred
      const releasedAmount = await escrow.releasedAmount();
      expect(releasedAmount).to.equal(ethers.parseEther("100"));
    });

    it("Should protect resolveDispute from reentrancy", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("100");
      const titles = ["Task"];
      const amounts = [ethers.parseEther("100")];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Raise dispute
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      // Arbiter resolves should succeed (ReentrancyGuard allows single call)
      const resolveTx = await escrow
        .connect(arbiter)
        .resolveDispute(0, client.address, ethers.parseEther("50"));
      const resolveReceipt = await resolveTx.wait();

      // Verify resolution was successful
      expect(resolveReceipt.status).to.equal(1); // Success

      // Verify dispute is resolved
      expect(await escrow.disputeActive()).to.be.false;
    });
  });

  describe("Multi-Milestone State Management", function () {
    it("Should track independent state for each milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("300");
      const titles = ["Phase 1", "Phase 2", "Phase 3"];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("100"),
        ethers.parseEther("100"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Milestone 0: Pending
      let m0 = (await escrow.getMilestones())[0];
      expect(m0.status).to.equal(0);

      // Complete milestone 0
      await escrow.connect(provider).markMilestoneComplete(0);
      m0 = (await escrow.getMilestones())[0];
      expect(m0.status).to.equal(1); // Submitted

      // Milestone 1 and 2 still Pending
      let m1 = (await escrow.getMilestones())[1];
      let m2 = (await escrow.getMilestones())[2];
      expect(m1.status).to.equal(0);
      expect(m2.status).to.equal(0);

      // Complete milestone 1
      await escrow.connect(provider).markMilestoneComplete(1);
      m1 = (await escrow.getMilestones())[1];
      expect(m1.status).to.equal(1); // Submitted

      // Milestone 2 still Pending
      m2 = (await escrow.getMilestones())[2];
      expect(m2.status).to.equal(0);

      // Approve milestone 0
      await escrow.connect(client).approveMilestone(0);
      m0 = (await escrow.getMilestones())[0];
      expect(m0.status).to.equal(2); // Approved

      // Milestone 1 still Submitted
      m1 = (await escrow.getMilestones())[1];
      expect(m1.status).to.equal(1);
    });

    it("Should calculate total withdrawal across all approved milestones", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("300");
      const titles = ["Phase 1", "Phase 2", "Phase 3"];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("100"),
        ethers.parseEther("100"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Complete and approve all three milestones
      for (let i = 0; i < 3; i++) {
        await escrow.connect(provider).markMilestoneComplete(i);
        await escrow.connect(client).approveMilestone(i);
      }

      // Withdraw all at once
      const initialBalance = await ethers.provider.getBalance(provider.address);
      const withdrawTx = await escrow.connect(provider).withdrawFunds();
      const withdrawReceipt = await withdrawTx.wait();
      const gasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(provider.address);
      const amountReceived = finalBalance - initialBalance + gasUsed;

      // Should receive all 300 ETH
      expect(amountReceived).to.equal(ethers.parseEther("300"));

      // All milestones should be Released
      const milestones = await escrow.getMilestones();
      for (let i = 0; i < 3; i++) {
        expect(milestones[i].status).to.equal(5); // Released
      }
    });
  });
});
