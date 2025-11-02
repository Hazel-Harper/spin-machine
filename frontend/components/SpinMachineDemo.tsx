"use client";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useSpinMachine } from "@/hooks/useSpinMachine";
import { useState } from "react";

export const SpinMachineDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const spinMachine = useSpinMachine({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [showStats, setShowStats] = useState(false);

  // Connection screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20">
          <div className="text-center">
            <div className="text-6xl mb-6">🎰</div>
            <h1 className="text-4xl font-bold text-white mb-4">SpinMachine</h1>
            <p className="text-xl text-white/80 mb-8">
              Encrypted Lottery System
            </p>
            <button
              onClick={connect}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Connect MetaMask
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not deployed screen
  // Only show when chainId is defined and contract is not deployed
  // This prevents false alerts when chainId is undefined
  if (chainId !== undefined && spinMachine.isDeployed === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20 max-w-2xl">
          <div className="text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Contract Not Deployed
            </h2>
            <p className="text-lg text-white/80 mb-4">
              The SpinMachine contract is not deployed on chain ID: {chainId}
            </p>
            <p className="text-sm text-white/60">
              Please deploy the contract first or switch to a network where it's
              deployed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎰</span>
              <div>
                <h1 className="text-2xl font-bold text-white">SpinMachine</h1>
                <p className="text-sm text-white/60">
                  Encrypted Lottery System
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Chain ID</p>
              <p className="text-lg font-semibold text-white">{chainId}</p>
              {accounts && accounts[0] && (
                <>
                  <p className="text-sm text-white/60 mt-2">Account</p>
                  <p className="text-sm font-mono text-white/80">
                    {accounts[0].slice(0, 6)}...{accounts[0].slice(-4)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Spin Area */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Try Your Luck!
                </h2>
                <p className="text-white/70">
                  Click the button below to spin and win encrypted rewards
                </p>
              </div>

              {/* Spin Button */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={spinMachine.executeSpin}
                  disabled={!spinMachine.canSpin}
                  className={`
                    relative w-64 h-64 rounded-full
                    ${spinMachine.canSpin
                      ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 shadow-2xl transform hover:scale-105 transition-all cursor-pointer"
                      : "bg-gray-600 opacity-50 cursor-not-allowed"
                    }
                    flex items-center justify-center
                    border-4 border-white/30
                  `}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-2">🎰</div>
                    <div className="text-xl font-bold text-white">
                      {spinMachine.isSpinning ? "Spinning..." : "SPIN NOW"}
                    </div>
                  </div>
                  {spinMachine.isSpinning && (
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
                  )}
                </button>
              </div>

              {/* Reward and Random Result Display */}
              {spinMachine.rewardHandle && (
                <div className="bg-black/30 rounded-xl p-6 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-4">
                      Your Encrypted Reward
                    </p>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      {spinMachine.isDecrypted ? (
                        <div className="text-4xl font-bold text-yellow-400">
                          {String(spinMachine.clear || 0)} 🎁
                        </div>
                      ) : (
                        <div className="text-2xl font-mono text-white/40">
                          {spinMachine.rewardHandle.reward.slice(0, 20)}...
                        </div>
                      )}
                    </div>
                    
                    {/* Display decrypted random result if available */}
                    {spinMachine.isDecrypted && spinMachine.clearRandomResult !== undefined && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <p className="text-sm text-white/60 mb-2">
                          🎲 Random Result
                        </p>
                        <div className="text-2xl font-mono font-bold text-green-300">
                          {String(spinMachine.clearRandomResult)}
                        </div>
                      </div>
                    )}
                    
                    {!spinMachine.isDecrypted && (
                      <button
                        onClick={spinMachine.decryptRewardHandle}
                        disabled={!spinMachine.canDecrypt}
                        className={`
                          mt-4 px-6 py-2 rounded-lg font-semibold transition-all
                          ${spinMachine.canDecrypt
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : "bg-gray-600 text-gray-300 cursor-not-allowed"
                          }
                        `}
                      >
                        {spinMachine.isDecrypting
                          ? "Decrypting..."
                          : "Decrypt Reward & Random Result"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Status Message */}
              {spinMachine.message && (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                  <p className="text-sm text-white/90 text-center">
                    {spinMachine.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* FHEVM Status */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">
                FHEVM Status
              </h3>
              <div className="space-y-2">
                <StatusItem
                  label="Instance"
                  value={fhevmInstance ? "✅ Ready" : "⏳ Loading"}
                />
                <StatusItem label="Status" value={fhevmStatus} />
                {fhevmError && (
                  <StatusItem
                    label="Error"
                    value={fhevmError.message}
                    isError
                  />
                )}
              </div>
            </div>

            {/* Prize Level Probabilities */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">
                Prize Level Probabilities
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎁</span>
                    <span className="text-white font-medium">Level 0: No Prize</span>
                  </div>
                  <span className="text-yellow-400 font-bold">25%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥉</span>
                    <span className="text-white font-medium">Level 1: Small Prize</span>
                  </div>
                  <span className="text-green-400 font-bold">40%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥈</span>
                    <span className="text-white font-medium">Level 2: Medium Prize</span>
                  </div>
                  <span className="text-blue-400 font-bold">30%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥇</span>
                    <span className="text-white font-medium">Level 3: Large Prize</span>
                  </div>
                  <span className="text-purple-400 font-bold">5%</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-white/60 text-center">
                  Range: 0-24 (L0), 25-64 (L1), 65-94 (L2), 95-99 (L3)
                </p>
              </div>
            </div>

            {/* Game Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Game Stats</h3>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {showStats ? "▼" : "▶"}
                </button>
              </div>
              {showStats && (
                <div className="space-y-2 text-sm">
                  <StatusItem
                    label="Contract"
                    value={
                      spinMachine.contractAddress
                        ? `${spinMachine.contractAddress.slice(0, 6)}...${spinMachine.contractAddress.slice(-4)}`
                        : "Not deployed"
                    }
                  />
                  <StatusItem
                    label="Can Spin"
                    value={spinMachine.canSpin ? "✅ Yes" : "❌ No"}
                  />
                  <StatusItem
                    label="Can Decrypt"
                    value={spinMachine.canDecrypt ? "✅ Yes" : "❌ No"}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={spinMachine.refreshRewardHandle}
                  disabled={!spinMachine.canGetReward}
                  className={`
                    w-full px-4 py-3 rounded-lg font-semibold transition-all
                    ${spinMachine.canGetReward
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-gray-600 text-gray-300 cursor-not-allowed"
                    }
                  `}
                >
                  🔄 Refresh Reward
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatusItem({
  label,
  value,
  isError = false,
}: {
  label: string;
  value: string;
  isError?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/60 text-sm">{label}:</span>
      <span
        className={`font-semibold text-sm ${
          isError ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
