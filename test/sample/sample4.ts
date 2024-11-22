import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import type { FhevmInstance } from "fhevmjs";
import { ethers } from "hardhat";

import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * Helper function to setup reencryption
 */
async function setupReencryption(instance: FhevmInstance, signer: HardhatEthersSigner, contractAddress: string) {
  const { publicKey, privateKey } = instance.generateKeypair();
  const eip712 = instance.createEIP712(publicKey, contractAddress);
  const signature = await signer.signTypedData(eip712.domain, { Reencrypt: eip712.types.Reencrypt }, eip712.message);

  return { publicKey, privateKey, signature: signature.replace("0x", "") };
}

describe("EncryptedCounter", function () {
  before(async function () {
    await initSigners(2); // Initialize signers
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const CounterFactory = await ethers.getContractFactory("EncryptedCounter4");
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

  it("should allow reencryption and decryption of counter value", async function () {
    // First increment counter to have a known value
    const tx = await this.counterContract.increment();
    await tx.wait();

    // Get the encrypted counter value
    const encryptedCounter = await this.counterContract.getCounter();

    // Set up reencryption keys and signature
    const { publicKey, privateKey, signature } = await setupReencryption(
      this.instances.alice,
      this.signers.alice,
      this.contractAddress,
    );

    // Perform reencryption and decryption
    const decryptedValue = await this.instances.alice.reencrypt(
      encryptedCounter,
      privateKey,
      publicKey,
      signature,
      this.contractAddress,
      this.signers.alice.address,
    );

    // Verify the decrypted value is 1 (since we incremented once)
    expect(decryptedValue).to.equal(1);
  });

  it("should allow reencryption of counter value", async function () {
    // First increment counter to have a known value
    const tx = await this.counterContract.connect(this.signers.bob).increment();
    await tx.wait();

    // Get the encrypted counter value
    const encryptedCounter = await this.counterContract.connect(this.signers.bob).getCounter();

    // Set up reencryption keys and signature
    const { publicKey, privateKey, signature } = await setupReencryption(
      this.instances.bob,
      this.signers.bob,
      this.contractAddress,
    );

    // Perform reencryption and decryption
    const decryptedValue = await this.instances.bob.reencrypt(
      encryptedCounter,
      privateKey,
      publicKey,
      signature,
      this.contractAddress,
      this.signers.bob.address,
    );

    // Verify the decrypted value is 1 (since we incremented once)
    expect(decryptedValue).to.equal(1);
  });
});
