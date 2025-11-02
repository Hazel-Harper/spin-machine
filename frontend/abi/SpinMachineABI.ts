// Auto-generated from contract artifacts
// Do not edit manually - run 'npm run generate:frontend' to regenerate

export const SpinMachineABI = {
  abi: [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "activityId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "name": "ActivityCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "activityId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "name": "ActivityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "seedHash",
        "type": "bytes32"
      }
    ],
    "name": "SpinExecuted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint32",
        "name": "multiplier",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "multiplierProof",
        "type": "bytes"
      }
    ],
    "name": "createActivity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "activityId",
        "type": "uint256"
      }
    ],
    "name": "getActivity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      },
      {
        "internalType": "euint32",
        "name": "multiplier",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActivityCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUserHistoryCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getUserHistoryRecord",
    "outputs": [
      {
        "components": [
          {
            "internalType": "euint64",
            "name": "timestamp",
            "type": "bytes32"
          },
          {
            "internalType": "euint32",
            "name": "poolLevel",
            "type": "bytes32"
          },
          {
            "internalType": "euint32",
            "name": "reward",
            "type": "bytes32"
          },
          {
            "internalType": "euint32",
            "name": "seedHash",
            "type": "bytes32"
          },
          {
            "internalType": "euint32",
            "name": "resultHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct SpinMachine.SpinRecord",
        "name": "record",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUserRandomResult",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "randomResult",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUserReward",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "level",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "reward",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUserStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "euint32",
            "name": "totalSpins",
            "type": "bytes32"
          },
          {
            "internalType": "euint32",
            "name": "totalWins",
            "type": "bytes32"
          },
          {
            "internalType": "euint32",
            "name": "totalRewards",
            "type": "bytes32"
          }
        ],
        "internalType": "struct SpinMachine.UserStats",
        "name": "stats",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32",
        "name": "encryptedSeed",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "spin",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "encryptedReward",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "encryptedLevel",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "activityId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "name": "updateActivity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
};
