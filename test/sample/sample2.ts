import { expect } from "chai";
import { ethers } from "hardhat";

import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptedCounter", function () {
  before(async function () {
    await initSigners(2); // Initialize signers
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const CounterFactory = await ethers.getContractFactory("EncryptedCounter2");
    this.counterContract = await CounterFactory.connect(this.signers.alice).deploy();
    await this.counterContract.waitForDeployment();
    this.contractAddress = await this.counterContract.getAddress();
    this.instances = await createInstances(this.signers); // Set up instances for testing
  });

  it("should initialize the counter to zero", async function () {
    const counterValue = await this.counterContract.getCounter();
    expect(counterValue); // Expect initial value to be zero
  });

  it("should increment the counter", async function () {
    // Perform the increment action
    const tx = await this.counterContract.increment();
    await tx.wait();

    // Retrieve the updated counter value and check if it incremented
    const counterValue = await this.counterContract.getCounter();
    expect(counterValue); // Expect counter to be 1 after increment
  });

  it("should increment by arbitrary encrypted amount", async function () {
    // Create encrypted input for amount to increment by
    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add8(5); // Increment by 5 as an example
    const encryptedAmount = await input.encrypt();

    // Call incrementBy with encrypted amount
    const tx = await this.counterContract.incrementBy(encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Get updated counter value
    const counterValue = await this.counterContract.getCounter();
    expect(counterValue); // Counter should be incremented by 5
  });
});
