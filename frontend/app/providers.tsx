"use client";

import { ReactNode } from "react";
import { MetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";

/**
 * Root providers component that wraps the app with necessary context providers
 * Includes MetaMask integration and in-memory storage for FHEVM decryption signatures
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider
        initialMockChains={{ 31337: "http://localhost:8545" }}
      >
        <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
}

