import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import dotenv from "dotenv";
import * as fs from "fs-extra";
import "hardhat-deploy";
import "hardhat-ignore-warnings";
import type { HardhatUserConfig, extendProvider } from "hardhat/config";
import { task } from "hardhat/config";
import type { NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";
import * as path from "path";

import CustomProvider from "./CustomProvider";
// Adjust the import path as needed
import "./tasks/accounts";
import "./tasks/getEthereumAddress";
import "./tasks/mint";
import "./tasks/taskDeploy";
import "./tasks/taskGatewayRelayer";
import "./tasks/taskTFHE";

extendProvider(async (provider, config, network) => {
  const newProvider = new CustomProvider(provider);
  return newProvider;
});

task("compile:specific", "Compiles only the specified contract")
  .addParam("contract", "The contract's path")
  .setAction(async ({ contract }, hre) => {
    // Adjust the configuration to include only the specified contract
    hre.config.paths.sources = contract;

    await hre.run("compile");
  });

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenv.config({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
let mnemonic: string = process.env.MNEMONIC!;

const chainIds = {
  zama: 8009,
  local: 9000,
  localCoprocessor: 12345,
  sepolia: 11155111,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string;
  switch (chain) {
    case "local":
      jsonRpcUrl = "http://localhost:8545";
      break;
    case "localCoprocessor":
      jsonRpcUrl = "http://localhost:8745";
      break;
    case "zama":
      jsonRpcUrl = "https://devnet.zama.ai";
      break;
    case "sepolia":
      jsonRpcUrl = process.env.SEPOLIA_RPC_URL!;
  }
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[chain],
    url: jsonRpcUrl,
  };
}

task("coverage").setAction(async (taskArgs, hre, runSuper) => {
  hre.config.networks.hardhat.allowUnlimitedContractSize = true;
  hre.config.networks.hardhat.blockGasLimit = 1099511627775;

  await runSuper(taskArgs);
});

function replaceImportStatement(filePath: string, oldImport: string, newImport: string): void {
  try {
    let fileContent = fs.readFileSync(filePath, "utf-8");
    fileContent = fileContent.replace(oldImport, newImport);
    fs.writeFileSync(filePath, fileContent, "utf-8");
  } catch (error) {
    console.error(`Error updating file: ${error}`);
  }
}

task("test", async (taskArgs, hre, runSuper) => {
  // Run modified test task
  if (hre.network.name === "hardhat") {
    // in fhevm mode all this block is done when launching the node via `pnmp fhevm:start`
    const privKeyGatewayDeployer = process.env.PRIVATE_KEY_GATEWAY_DEPLOYER;
    const privKeyFhevmDeployer = process.env.PRIVATE_KEY_FHEVM_DEPLOYER;
    await hre.run("task:computeGatewayAddress", { privateKey: privKeyGatewayDeployer });
    await hre.run("task:computeACLAddress", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:computeTFHEExecutorAddress", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:computeKMSVerifierAddress", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:computeInputVerifierAddress", { privateKey: privKeyFhevmDeployer, useAddress: false });
    await hre.run("task:computeFHEPaymentAddress", { privateKey: privKeyFhevmDeployer });
    await hre.run("compile:specific", { contract: "contracts/" });
    const sourceDir = path.resolve(__dirname, "node_modules/fhevm-core-contracts/");
    const destinationDir = path.resolve(__dirname, "fhevmTemp/");
    fs.copySync(sourceDir, destinationDir, { dereference: true });

    const sourceDir2 = path.resolve("./node_modules/fhevm/gateway/GatewayContract.sol");
    const destinationFilePath = path.join(destinationDir, "GatewayContract.sol");
    fs.copySync(sourceDir2, destinationFilePath, { dereference: true });
    const oldImport = `import "../lib/TFHE.sol";`;
    const newImport = `import "fhevm/lib/TFHE.sol";`;
    replaceImportStatement(destinationFilePath, oldImport, newImport);
    const sourceDir3 = path.resolve("./node_modules/fhevm/gateway/IKMSVerifier.sol");
    const destinationFilePath3 = path.join(destinationDir, "IKMSVerifier.sol");
    fs.copySync(sourceDir3, destinationFilePath3, { dereference: true });

    await hre.run("compile:specific", { contract: "fhevmTemp/" });
    await hre.run("task:faucetToPrivate", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:deployACL", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:deployTFHEExecutor", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:deployKMSVerifier", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:deployInputVerifier", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:deployFHEPayment", { privateKey: privKeyFhevmDeployer });
    await hre.run("task:addSigners", {
      numSigners: process.env.NUM_KMS_SIGNERS!,
      privateKey: privKeyFhevmDeployer,
      useAddress: false,
    });
    await hre.run("task:launchFhevm", { skipGetCoin: false, useAddress: false });
  }
  await runSuper();
});

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 500000,
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      accounts: {
        count: 10,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
    },
    sepolia: getChainConfig("sepolia"),
    zama: getChainConfig("zama"),
    localDev: getChainConfig("local"),
    local: getChainConfig("local"),
    localCoprocessor: getChainConfig("localCoprocessor"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY!,
  },
  warnings: {
    "*": {
      "transient-storage": false,
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
