import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("EscrowProject Contract Tests", function () {
  describe("Deposit Function - Fund Custody", function () {
    it("Should deposit correct amount when creating project", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;

      // Verify escrow contract received the 120 ETH
      const balance = await ethers.provider.getBalance(projectAddress);
      expect(balance).to.equal(totalAmount);
    });

    it("Should reject deposit with incorrect amount", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];
      const wrongAmount = ethers.parseEther("100");

      // Should fail with "Incorrect deposit amount" error
      await expect(
        projectFactory.createProject(
          provider.address,
          arbiter.address,
          titles,
          amounts,
          { value: wrongAmount },
        ),
      ).to.be.revertedWith("Incorrect deposit amount");
    });

    it("Should store totalAmount correctly", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const storedTotal = await escrow.totalAmount();
      expect(storedTotal).to.equal(totalAmount);
    });

    it("Should initialize releasedAmount to 0", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const releasedAmount = await escrow.releasedAmount();
      expect(releasedAmount).to.equal(0);
    });
  });

  describe("AccessControl - Role Management", function () {
    it("Should grant CLIENT_ROLE to client address", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const CLIENT_ROLE = await escrow.CLIENT_ROLE();
      const hasRole = await escrow.hasRole(CLIENT_ROLE, client.address);
      expect(hasRole).to.be.true;
    });

    it("Should grant PROVIDER_ROLE to provider address", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const PROVIDER_ROLE = await escrow.PROVIDER_ROLE();
      const hasRole = await escrow.hasRole(PROVIDER_ROLE, provider.address);
      expect(hasRole).to.be.true;
    });

    it("Should grant ARBITER_ROLE to arbiter address", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const ARBITER_ROLE = await escrow.ARBITER_ROLE();
      const hasRole = await escrow.hasRole(ARBITER_ROLE, arbiter.address);
      expect(hasRole).to.be.true;
    });

    it("Should prevent non-provider from marking milestone complete", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Only provider can call markMilestoneComplete
      await expect(
        escrow.connect(client).markMilestoneComplete(0),
      ).to.be.revertedWithCustomError(
        escrow,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("Should prevent non-client from approving milestone", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // First, provider marks complete
      await escrow.connect(provider).markMilestoneComplete(0);

      // Try to approve as non-client
      await expect(
        escrow.connect(provider).approveMilestone(0),
      ).to.be.revertedWithCustomError(
        escrow,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("Should prevent non-arbiter from resolving dispute", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Raise dispute first
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      // Try to resolve as non-arbiter
      await expect(
        escrow
          .connect(client)
          .resolveDispute(0, provider.address, ethers.parseEther("50")),
      ).to.be.revertedWithCustomError(
        escrow,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("Should allow provider to withdraw when authorized", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Mark complete
      await escrow.connect(provider).markMilestoneComplete(0);

      // Approve as client
      await escrow.connect(client).approveMilestone(0);

      // Provider should be able to call withdrawFunds
      const initialBalance = await ethers.provider.getBalance(provider.address);

      const withdrawTx = await escrow.connect(provider).withdrawFunds();
      const withdrawReceipt = await withdrawTx.wait();
      const gasUsed = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(provider.address);
      const amountReceived = finalBalance - initialBalance + gasUsed;

      expect(amountReceived).to.equal(ethers.parseEther("50"));
    });

    it("Should prevent client from withdrawing funds", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Mark complete and approve
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Client should NOT be able to withdraw
      await expect(
        escrow.connect(client).withdrawFunds(),
      ).to.be.revertedWithCustomError(
        escrow,
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("Milestone Data Structure", function () {
    it("Should store milestone titles correctly", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const fetchedMilestones = await escrow.getMilestones();
      expect(fetchedMilestones.length).to.equal(3);
      expect(fetchedMilestones[0].title).to.equal("Foundation");
      expect(fetchedMilestones[1].title).to.equal("Walls");
      expect(fetchedMilestones[2].title).to.equal("Roof");
    });

    it("Should store milestone amounts correctly", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const fetchedMilestones = await escrow.getMilestones();
      expect(fetchedMilestones[0].amount).to.equal(ethers.parseEther("50"));
      expect(fetchedMilestones[1].amount).to.equal(ethers.parseEther("40"));
      expect(fetchedMilestones[2].amount).to.equal(ethers.parseEther("30"));
    });

    it("Should initialize all milestones with Pending status", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const fetchedMilestones = await escrow.getMilestones();
      // Status 0 = Pending
      expect(fetchedMilestones[0].status).to.equal(0);
      expect(fetchedMilestones[1].status).to.equal(0);
      expect(fetchedMilestones[2].status).to.equal(0);
    });

    it("Should return correct milestone count", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      const count = await escrow.getMilestonesCount();
      expect(count).to.equal(3);
    });
  });

  describe("Fund Custody Safety", function () {
    it("Should not allow provider to withdraw without approval", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Mark complete but DON'T approve
      await escrow.connect(provider).markMilestoneComplete(0);

      // Provider tries to withdraw (should fail)
      await expect(
        escrow.connect(provider).withdrawFunds(),
      ).to.be.revertedWithCustomError(escrow, "InsufficientBalance");
    });

    it("Should track releasedAmount after withdrawal", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Complete and approve
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Withdraw
      await escrow.connect(provider).withdrawFunds();

      // Check releasedAmount increased
      const releasedAmount = await escrow.releasedAmount();
      expect(releasedAmount).to.equal(ethers.parseEther("50"));
    });

    it("Should keep correct balance after partial withdrawal", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Complete and approve milestone 1
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).approveMilestone(0);

      // Withdraw
      await escrow.connect(provider).withdrawFunds();

      // Check remaining balance
      const balance = await ethers.provider.getBalance(escrow.target);
      expect(balance).to.equal(ethers.parseEther("70"));
    });

    it("Should allow client to receive funds from arbiter settlement", async function () {
      const [client, provider, arbiter] = await ethers.getSigners();
      const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
      const projectFactory = await ProjectFactory.deploy();

      const totalAmount = ethers.parseEther("120");
      const titles = ["Foundation", "Walls", "Roof"];
      const amounts = [
        ethers.parseEther("50"),
        ethers.parseEther("40"),
        ethers.parseEther("30"),
      ];

      const tx = await projectFactory.createProject(
        provider.address,
        arbiter.address,
        titles,
        amounts,
        { value: totalAmount },
      );

      const receipt = await tx.wait();
      const events = await projectFactory.queryFilter(
        projectFactory.filters.ProjectCreated(),
        receipt.blockNumber,
      );
      const projectAddress = events[0].args.projectAddress;
      const Escrow = await ethers.getContractFactory("EscrowProject");
      const escrow = Escrow.attach(projectAddress);

      // Raise dispute
      await escrow.connect(provider).markMilestoneComplete(0);
      await escrow.connect(client).raiseDispute(0);

      const clientInitialBalance = await ethers.provider.getBalance(
        client.address,
      );

      // Arbiter settles in favor of client
      const settlementAmount = ethers.parseEther("50");
      await escrow
        .connect(arbiter)
        .resolveDispute(0, client.address, settlementAmount);

      const clientFinalBalance = await ethers.provider.getBalance(
        client.address,
      );

      expect(clientFinalBalance - clientInitialBalance).to.equal(
        settlementAmount,
      );
    });
  });
});
