"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { SpinMachineAddresses } from "@/abi/SpinMachineAddresses";
import { SpinMachineABI } from "@/abi/SpinMachineABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type SpinMachineInfoType = {
  abi: typeof SpinMachineABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getSpinMachineByChainId(
  chainId: number | undefined
): SpinMachineInfoType {
  if (!chainId) {
    return { abi: SpinMachineABI.abi };
  }

  const entry =
    SpinMachineAddresses[chainId.toString() as keyof typeof SpinMachineAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: SpinMachineABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: SpinMachineABI.abi,
  };
}

export const useSpinMachine = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [rewardHandle, setRewardHandle] = useState<{
    level: string;
    reward: string;
  } | undefined>(undefined);
  const [clearReward, setClearReward] = useState<ClearValueType | undefined>(
    undefined
  );
  const clearRewardRef = useRef<ClearValueType>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [randomResultHandle, setRandomResultHandle] = useState<string | undefined>(undefined);
  const [clearRandomResult, setClearRandomResult] = useState<ClearValueType | undefined>(undefined);
  const clearRandomResultRef = useRef<ClearValueType>(undefined);

  const spinMachineRef = useRef<SpinMachineInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isSpinningRef = useRef<boolean>(isSpinning);

  const spinMachine = useMemo(() => {
    const c = getSpinMachineByChainId(chainId);
    spinMachineRef.current = c;
    // Only show message when chainId is defined and address is missing
    // This prevents false alerts when chainId is undefined or address exists
    if (chainId !== undefined && !c.address) {
      setMessage(`SpinMachine deployment not found for chainId=${chainId}.`);
    }
    // Don't clear message here - let other operations set their own messages
    // This preserves debug/error messages from other operations
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!spinMachine) {
      return undefined;
    }
    return (
      Boolean(spinMachine.address) &&
      spinMachine.address !== ethers.ZeroAddress
    );
  }, [spinMachine]);

  const canGetReward = useMemo(() => {
    return (
      spinMachine.address && ethersReadonlyProvider && !isRefreshing
    );
  }, [spinMachine.address, ethersReadonlyProvider, isRefreshing]);

  const refreshRewardHandle = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    if (
      !spinMachineRef.current ||
      !spinMachineRef.current?.chainId ||
      !spinMachineRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setRewardHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = spinMachineRef.current.chainId;
    const thisSpinMachineAddress = spinMachineRef.current.address;

    const thisSpinMachineContract = new ethers.Contract(
      thisSpinMachineAddress,
      spinMachineRef.current.abi,
      ethersReadonlyProvider
    );

    // Get reward first (required)
    thisSpinMachineContract.getUserReward()
      .then((rewardValue: [string, string]) => {
        if (
          sameChain.current(thisChainId) &&
          thisSpinMachineAddress === spinMachineRef.current?.address
        ) {
          setRewardHandle({ level: rewardValue[0], reward: rewardValue[1] });
        }

        // Try to get random result (optional - may fail if user hasn't spun yet)
        thisSpinMachineContract.getUserRandomResult()
          .then((randomResultValue: string) => {
            if (
              sameChain.current(thisChainId) &&
              thisSpinMachineAddress === spinMachineRef.current?.address
            ) {
              setRandomResultHandle(randomResultValue);
            }
          })
          .catch(() => {
            // Random result is optional - user may not have spun yet
            // Clear it if it was previously set
            if (
              sameChain.current(thisChainId) &&
              thisSpinMachineAddress === spinMachineRef.current?.address
            ) {
              setRandomResultHandle(undefined);
            }
          })
          .finally(() => {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
          });
      })
      .catch((e: Error) => {
        setMessage("SpinMachine.getUserReward() call failed! error=" + e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    refreshRewardHandle();
  }, [refreshRewardHandle]);

  const canDecrypt = useMemo(() => {
    return (
      spinMachine.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      rewardHandle &&
      rewardHandle.reward !== ethers.ZeroHash &&
      rewardHandle.reward !== clearReward?.handle
    );
  }, [
    spinMachine.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    rewardHandle,
    clearReward,
  ]);

  const canDecryptRandom = useMemo(() => {
    return (
      spinMachine.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      randomResultHandle !== undefined &&
      randomResultHandle !== ethers.ZeroHash &&
      randomResultHandle !== clearRandomResult?.handle
    );
  }, [
    spinMachine.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    randomResultHandle,
    clearRandomResult,
  ]);

  const decryptRewardHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!spinMachine.address || !instance || !ethersSigner) {
      return;
    }

    if (rewardHandle?.reward === clearRewardRef.current?.handle) {
      return;
    }

    if (!rewardHandle?.reward) {
      setClearReward(undefined);
      clearRewardRef.current = undefined;
      return;
    }

    if (rewardHandle.reward === ethers.ZeroHash) {
      setClearReward({ handle: rewardHandle.reward, clear: BigInt(0) });
      clearRewardRef.current = { handle: rewardHandle.reward, clear: BigInt(0) };
      return;
    }

    const thisChainId = chainId;
    const thisSpinMachineAddress = spinMachine.address;
    const thisRewardHandle = rewardHandle.reward;
    const thisRandomResultHandle = randomResultHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypt");

    const run = async () => {
      const isStale = () =>
        thisSpinMachineAddress !== spinMachineRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [spinMachine.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt...");

        // Prepare handles to decrypt: both reward and random result
        const handlesToDecrypt = [
          { handle: thisRewardHandle, contractAddress: thisSpinMachineAddress }
        ];
        
        // Add random result handle if it exists and is not zero
        if (thisRandomResultHandle && thisRandomResultHandle !== ethers.ZeroHash) {
          handlesToDecrypt.push({
            handle: thisRandomResultHandle,
            contractAddress: thisSpinMachineAddress
          });
        }

        const res = await instance.userDecrypt(
          handlesToDecrypt,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        // Set decrypted reward
        const resRecord = res as Record<string, string | bigint | boolean>;
        setClearReward({ handle: thisRewardHandle, clear: resRecord[thisRewardHandle] });
        clearRewardRef.current = {
          handle: thisRewardHandle,
          clear: resRecord[thisRewardHandle],
        };

        // Set decrypted random result if available
        if (thisRandomResultHandle && thisRandomResultHandle !== ethers.ZeroHash) {
          const randomResultValue = resRecord[thisRandomResultHandle];
          if (randomResultValue !== undefined) {
            const cv = {
              handle: thisRandomResultHandle,
              clear: randomResultValue
            } as ClearValueType;
            setClearRandomResult(cv);
            clearRandomResultRef.current = cv;
            setMessage(
              "Reward: " + clearRewardRef.current.clear + ", Random Result: " + randomResultValue
            );
          } else {
            // Debug: log what handles are available
            const availableHandles = Object.keys(res);
            setMessage(
              "Reward: " + clearRewardRef.current.clear + ", Random result handle not found. Available handles: " + availableHandles.join(", ")
            );
            // Clear random result if it was previously set
            setClearRandomResult(undefined);
          }
        } else {
          setMessage(
            "Reward handle clear value is " + clearRewardRef.current.clear
          );
        }
      } catch (error) {
        setMessage("Decryption failed: " + (error as Error).message);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    spinMachine.address,
    instance,
    rewardHandle,
    randomResultHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const decryptRandomResultHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }
    if (!spinMachine.address || !instance || !ethersSigner) {
      return;
    }
    if (!randomResultHandle) {
      setClearRandomResult(undefined);
      clearRandomResultRef.current = undefined;
      return;
    }
    if (randomResultHandle === ethers.ZeroHash) {
      const cv = { handle: randomResultHandle, clear: BigInt(0) } as ClearValueType;
      setClearRandomResult(cv);
      clearRandomResultRef.current = cv;
      return;
    }

    const thisChainId = chainId;
    const thisSpinMachineAddress = spinMachine.address;
    const thisRandomResultHandle = randomResultHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypt random result");

    const run = async () => {
      const isStale = () =>
        thisSpinMachineAddress !== spinMachineRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [spinMachine.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }
        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt (random result)...");

        const handlesToDecrypt = [
          { handle: thisRandomResultHandle, contractAddress: thisSpinMachineAddress },
        ];

        const res = await instance.userDecrypt(
          handlesToDecrypt,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt (random result) completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        const resRecord = res as Record<string, string | bigint | boolean>;
        const randomResultValue = resRecord[thisRandomResultHandle];
        if (randomResultValue !== undefined) {
          const cv = { handle: thisRandomResultHandle, clear: randomResultValue } as ClearValueType;
          setClearRandomResult(cv);
          clearRandomResultRef.current = cv;
        } else {
          const availableHandles = Object.keys(resRecord);
          setMessage(
            "Random result handle not found. Available handles: " + availableHandles.join(", ")
          );
        }
      } catch (error) {
        setMessage("Decryption failed: " + (error as Error).message);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    spinMachine.address,
    instance,
    randomResultHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const canSpin = useMemo(() => {
    return (
      spinMachine.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isSpinning
    );
  }, [spinMachine.address, instance, ethersSigner, isRefreshing, isSpinning]);

  const executeSpin = useCallback(() => {
    if (isRefreshingRef.current || isSpinningRef.current) {
      return;
    }

    if (!spinMachine.address || !instance || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisSpinMachineAddress = spinMachine.address;
    const thisEthersSigner = ethersSigner;
    const thisSpinMachineContract = new ethers.Contract(
      thisSpinMachineAddress,
      spinMachine.abi,
      thisEthersSigner
    );

    isSpinningRef.current = true;
    setIsSpinning(true);
    setMessage("Start spin...");

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const isStale = () =>
        thisSpinMachineAddress !== spinMachineRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        // Generate random seed (encrypted, not stored in plaintext)
        const seed = Math.floor(Math.random() * 2 ** 32);

        const input = instance.createEncryptedInput(
          thisSpinMachineAddress,
          thisEthersSigner.address
        );
        input.add32(BigInt(seed));

        const enc = await input.encrypt();

        if (isStale()) {
          setMessage("Ignore spin");
          return;
        }

        setMessage("Call spin...");

        const tx: ethers.TransactionResponse = await thisSpinMachineContract.spin(
          enc.handles[0],
          enc.inputProof
        );

        setMessage(`Wait for tx:${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Spin completed status=${receipt?.status}`);

        if (isStale()) {
          setMessage("Ignore spin");
          return;
        }

        // Clear previous decrypted results so user needs to decrypt again for new spin
        setClearReward(undefined);
        clearRewardRef.current = undefined;
        setClearRandomResult(undefined);

        // Refresh reward and random result handles
        refreshRewardHandle();
      } catch (error) {
        setMessage("Spin Failed! " + (error as Error).message);
      } finally {
        isSpinningRef.current = false;
        setIsSpinning(false);
      }
    };

    run();
  }, [
    ethersSigner,
    spinMachine.address,
    spinMachine.abi,
    instance,
    chainId,
    refreshRewardHandle,
    sameChain,
    sameSigner,
  ]);

  return {
    contractAddress: spinMachine.address,
    canDecrypt,
    canGetReward,
    canSpin,
    executeSpin,
    decryptRewardHandle,
    decryptRandomResultHandle,
    refreshRewardHandle,
    isDecrypted: rewardHandle?.reward === clearReward?.handle,
    message,
    clear: clearReward?.clear,
    rewardHandle,
    isDecrypting,
    isRefreshing,
    isSpinning,
    isDeployed,
    clearRandomResult: clearRandomResult?.clear,
    randomResultHandle,
    canDecryptRandom,
  };
};

