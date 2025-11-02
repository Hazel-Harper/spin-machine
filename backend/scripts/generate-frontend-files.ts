import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Script to generate frontend ABI and address files from deployed contracts
 * Automatically reads deployment records and skips networks without deployments
 */

async function generateFrontendFiles(_hre: HardhatRuntimeEnvironment) {
  const contractName = "SpinMachine";
  // Use process.cwd() to get the project root, then navigate from there
  const projectRoot = process.cwd();
  
  const frontendAbiPath = path.join(projectRoot, "../frontend/abi/SpinMachineABI.ts");
  const frontendAddressesPath = path.join(projectRoot, "../frontend/abi/SpinMachineAddresses.ts");
  const artifactsPath = path.join(projectRoot, "artifacts/contracts/SpinMachine.sol/SpinMachine.json");
  const deploymentsDir = path.join(projectRoot, "deployments");

  // Network name to chain info mapping
  const networkToChainInfo: Record<string, { chainId: number; chainName: string }> = {
    hardhat: { chainId: 31337, chainName: "Hardhat Local" },
    localhost: { chainId: 31337, chainName: "Hardhat Local" },
    sepolia: { chainId: 11155111, chainName: "Sepolia Testnet" },
  };

  // Read ABI from artifacts
  if (!fs.existsSync(artifactsPath)) {
    console.error(`Artifacts not found at ${artifactsPath}`);
    console.error("Please compile contracts first: npm run compile");
    return;
  }

  let artifact;
  try {
    const artifactContent = fs.readFileSync(artifactsPath, "utf-8");
    artifact = JSON.parse(artifactContent);
  } catch (error) {
    console.error(`Failed to read or parse artifacts file: ${error}`);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
    }
    return;
  }

  const abi = artifact.abi;

  if (!abi || abi.length === 0) {
    console.error("ABI is empty in artifacts");
    return;
  }

  // Generate ABI file
  const abiContent = `// Auto-generated from contract artifacts
// Do not edit manually - run 'npm run generate:frontend' to regenerate

export const SpinMachineABI = {
  abi: ${JSON.stringify(abi, null, 2)} as const
};
`;

  fs.writeFileSync(frontendAbiPath, abiContent, "utf-8");

  // Read deployment records
  const addresses: Record<string, { address: string; chainId: number; chainName?: string }> = {};

  // First, check predefined networks
  for (const [networkName, chainInfo] of Object.entries(networkToChainInfo)) {
    const deploymentFile = path.join(deploymentsDir, networkName, `${contractName}.json`);

    if (fs.existsSync(deploymentFile)) {
      try {
        const deploymentContent = fs.readFileSync(deploymentFile, "utf-8");
        const deployment = JSON.parse(deploymentContent);
        
        if (deployment.address && deployment.address !== "0x0000000000000000000000000000000000000000") {
          // Use chainId as key to avoid duplicates (localhost and hardhat both use 31337)
          const chainIdKey = chainInfo.chainId.toString();
          
          // Only update if we don't have this chainId yet, or if this is a more specific network
          if (!addresses[chainIdKey] || (networkName === "localhost" && addresses[chainIdKey].address === "0x0000000000000000000000000000000000000000")) {
            addresses[chainIdKey] = {
              address: deployment.address as `0x${string}`,
              chainId: chainInfo.chainId,
              chainName: chainInfo.chainName,
            };
          }
        }
      } catch (error) {
        // Silently skip errors
      }
    }
  }

  // Also scan all deployment directories to find any additional networks
  if (fs.existsSync(deploymentsDir)) {
    try {
      const deploymentDirs = fs.readdirSync(deploymentsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const dirName of deploymentDirs) {
        // Skip if already processed in predefined networks
        if (networkToChainInfo[dirName]) {
          continue;
        }

        const deploymentFile = path.join(deploymentsDir, dirName, `${contractName}.json`);
        
        if (fs.existsSync(deploymentFile)) {
          try {
            const deploymentContent = fs.readFileSync(deploymentFile, "utf-8");
            const deployment = JSON.parse(deploymentContent);
            
            if (deployment.address && deployment.address !== "0x0000000000000000000000000000000000000000") {
              // Try to get chainId from .chainId file or use network name as fallback
              const chainIdFile = path.join(deploymentsDir, dirName, ".chainId");
              let chainId = 0;
              let chainName = dirName;

              if (fs.existsSync(chainIdFile)) {
                try {
                  chainId = parseInt(fs.readFileSync(chainIdFile, "utf-8").trim(), 10);
                } catch (e) {
                  // Silently skip errors
                }
              }

              // If we couldn't get chainId, try to infer from known networks or use a hash
              if (chainId === 0 || isNaN(chainId)) {
                continue;
              }

              const chainIdKey = chainId.toString();
              
              // Only add if we don't already have this chainId
              if (!addresses[chainIdKey]) {
                addresses[chainIdKey] = {
                  address: deployment.address as `0x${string}`,
                  chainId: chainId,
                  chainName: chainName,
                };
              }
            }
          } catch (error) {
            // Silently skip errors
          }
        }
      }
    } catch (error) {
      // Silently skip errors
    }
  }

  // If no deployments found, keep existing structure with zero address for hardhat
  if (Object.keys(addresses).length === 0) {
    addresses["31337"] = {
      address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      chainId: 31337,
      chainName: "Hardhat Local",
    };
  }

  // Generate addresses file with proper TypeScript formatting
  const addressesEntries = Object.entries(addresses)
    .map(([chainId, info]) => {
      return `  "${chainId}": {
    address: "${info.address}" as \`0x\${string}\`,
    chainId: ${info.chainId},
    chainName: "${info.chainName || ""}"
  }`;
    })
    .join(",\n");

  const addressesContent = `// Auto-generated from deployment records
// Do not edit manually - run 'npm run generate:frontend' to regenerate
// Chain ID 11155111 is Sepolia testnet

import { ethers } from "ethers";

export const SpinMachineAddresses: Record<string, {
  address: \`0x\${string}\`;
  chainId: number;
  chainName?: string;
}> = {
${addressesEntries}
};
`;

  fs.writeFileSync(frontendAddressesPath, addressesContent, "utf-8");
  console.log(`📊 Summary:`);
  console.log(`   - Networks with deployments: ${Object.keys(addresses).length}`);
  Object.entries(addresses).forEach(([chainId, info]) => {
    console.log(`   - Chain ${chainId} (${info.chainName}): ${info.address}`);
  });
}

// Run the script when executed directly by hardhat
// Hardhat run expects the script to execute directly, not just export a function
(async () => {
  try {
    // Create a minimal hre-like object or call without it since we don't use it
    const mockHre = {} as HardhatRuntimeEnvironment;
    await generateFrontendFiles(mockHre);
  } catch (error) {
    console.error("Error generating frontend files:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
})();

// Also export as default for compatibility
export default async function (hre: HardhatRuntimeEnvironment) {
  try {
    await generateFrontendFiles(hre);
  } catch (error) {
    console.error("Error generating frontend files:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

