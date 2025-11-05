// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, euint8, externalEuint32, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SpinMachine - Encrypted Lottery System based on Zama FHEVM
/// @notice A fair, verifiable, and privacy-preserving on-chain lottery game
contract SpinMachine is ZamaEthereumConfig {
    // ============ State Variables ============
    
    // Prize pool levels: 0 = no prize, 1 = small, 2 = medium, 3 = large
    struct PrizePool {
        euint32 level;      // Prize level (0-3)
        euint32 reward;     // Encrypted reward amount
    }
    
    // User spin record
    struct SpinRecord {
        euint64 timestamp;      // Encrypted timestamp
        euint32 poolLevel;      // Encrypted pool level
        euint32 reward;        // Encrypted reward
        euint32 seedHash;       // Encrypted seed hash
        euint32 resultHash;     // Encrypted result hash
    }
    
    // Activity configuration
    struct Activity {
        uint256 startTime;      // Plaintext start time
        uint256 endTime;        // Plaintext end time
        euint32 multiplier;     // Encrypted multiplier for rewards
        bool isActive;          // Plaintext activity status
    }
    
    // User statistics
    struct UserStats {
        euint32 totalSpins;     // Total number of spins
        euint32 totalWins;      // Total number of wins
        euint32 totalRewards;   // Total rewards accumulated
    }
    
    // Global state
    mapping(address => PrizePool) private _userRewards;
    mapping(address => SpinRecord[]) private _userHistory;
    mapping(address => UserStats) private _userStats;
    mapping(uint256 => Activity) private _activities;
    mapping(address => euint32) private _userRandomResults; // Store encrypted random result for each user
    
    uint256 private _activityCounter;
    address private _owner;
    
    // Prize pool configuration (plaintext for efficiency)
    uint32 private constant PRIZE_POOL_SIZE = 100;  // 0-99
    uint32 private constant NO_PRIZE_THRESHOLD = 25;  // 0-24: no prize (25%)
    uint32 private constant SMALL_PRIZE_THRESHOLD = 65;  // 25-64: small prize (40%)
    uint32 private constant MEDIUM_PRIZE_THRESHOLD = 95;  // 65-94: medium prize (30%)
    // 95-99: large prize (5%)
    
    // ============ Events ============
    event SpinExecuted(address indexed user, bytes32 seedHash);
    event ActivityCreated(uint256 indexed activityId, uint256 startTime, uint256 endTime);
    event ActivityUpdated(uint256 indexed activityId, bool isActive);
    
    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == _owner, "Not owner");
        _;
    }
    
    // ============ Constructor ============
    /// @notice Initialize the contract and set the owner
    constructor() {
        _owner = msg.sender;
    }
    
    // ============ Core Spin Function ============
    /// @notice Execute a spin with encrypted random seed
    /// @param encryptedSeed The encrypted random seed from frontend
    /// @param inputProof The zero-knowledge proof for the encrypted seed
    /// @return encryptedReward The encrypted reward amount
    /// @return encryptedLevel The encrypted prize level
    function spin(
        externalEuint32 encryptedSeed,
        bytes calldata inputProof
    ) external returns (euint32 encryptedReward, euint32 encryptedLevel) {
        // Convert external encrypted input to internal type
        euint32 seed = FHE.fromExternal(encryptedSeed, inputProof);
        
        // Generate additional on-chain randomness for security
        euint32 onChainRandom = FHE.randEuint32();
        
        // Combine user seed with on-chain randomness
        euint32 combinedRandom = FHE.xor(seed, onChainRandom);
        
        // Use combinedRandom as result
        // Note: FHE library doesn't support modulo operation directly
        // The determinePrizeLevel function will handle value range checking
        // For better distribution, we rely on the XOR operation's randomness
        euint32 result = combinedRandom;
        
        // Determine prize level based on result
        euint32 level = determinePrizeLevel(result);
        
        // Calculate reward based on level
        euint32 reward = calculateReward(level);
        
        // Check if there's an active activity and apply multiplier
        euint32 finalReward = applyActivityMultiplier(reward);
        
        // Store user reward
        _userRewards[msg.sender] = PrizePool({
            level: level,
            reward: finalReward
        });
        
        // Store encrypted random result for user to decrypt later
        _userRandomResults[msg.sender] = result;
        
        // Create spin record
        SpinRecord memory record = SpinRecord({
            timestamp: FHE.asEuint64(uint64(block.timestamp)),
            poolLevel: level,
            reward: finalReward,
            seedHash: seed,
            resultHash: result
        });
        
        _userHistory[msg.sender].push(record);
        
        // Update user statistics
        updateUserStats(msg.sender, level, finalReward);
        
        // Set ACL permissions for user to decrypt their data
        FHE.allowThis(level);
        FHE.allow(level, msg.sender);
        FHE.allowThis(finalReward);
        FHE.allow(finalReward, msg.sender);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        // Allow user to decrypt their history
        FHE.allowThis(record.timestamp);
        FHE.allow(record.timestamp, msg.sender);
        FHE.allowThis(record.poolLevel);
        FHE.allow(record.poolLevel, msg.sender);
        FHE.allowThis(record.reward);
        FHE.allow(record.reward, msg.sender);
        
        emit SpinExecuted(msg.sender, keccak256(abi.encodePacked(seed, block.timestamp)));
        
        return (finalReward, level);
    }
    
    // ============ Prize Level Determination ============
    /// @notice Determine prize level based on encrypted result
    /// @param result The encrypted result value (will be reduced to 0-99 range)
    /// @return level The encrypted prize level (0-3)
    function determinePrizeLevel(euint32 result) private returns (euint32) {
        // Reduce result to 0-99 range using modulo operation
        // FHE.rem performs: result % PRIZE_POOL_SIZE
        euint32 reducedResult = FHE.rem(result, PRIZE_POOL_SIZE);
        
        // Level 0: no prize (0-49)
        ebool isNoPrize = FHE.lt(reducedResult, FHE.asEuint32(NO_PRIZE_THRESHOLD));
        
        // Level 1: small prize (50-79)
        ebool isSmallPrize = FHE.and(
            FHE.ge(reducedResult, FHE.asEuint32(NO_PRIZE_THRESHOLD)),
            FHE.lt(reducedResult, FHE.asEuint32(SMALL_PRIZE_THRESHOLD))
        );
        
        // Level 2: medium prize (80-94)
        ebool isMediumPrize = FHE.and(
            FHE.ge(reducedResult, FHE.asEuint32(SMALL_PRIZE_THRESHOLD)),
            FHE.lt(reducedResult, FHE.asEuint32(MEDIUM_PRIZE_THRESHOLD))
        );
        
        // Level 3: large prize (95-99)
        // Ensure result is within valid range (0-99) and >= MEDIUM_PRIZE_THRESHOLD
        ebool isLargePrize = FHE.and(
            FHE.ge(reducedResult, FHE.asEuint32(MEDIUM_PRIZE_THRESHOLD)),
            FHE.lt(reducedResult, FHE.asEuint32(PRIZE_POOL_SIZE))
        );
        
        // Use select to choose the level
        // Priority: Level 3 > Level 2 > Level 1 > Level 0
        euint32 level1 = FHE.select(isSmallPrize, FHE.asEuint32(1), FHE.asEuint32(0));
        euint32 level2 = FHE.select(isMediumPrize, FHE.asEuint32(2), level1);
        euint32 level3 = FHE.select(isLargePrize, FHE.asEuint32(3), level2);
        
        // If no prize, return 0; otherwise return the determined level
        return FHE.select(isNoPrize, FHE.asEuint32(0), level3);
    }
    
    
    // ============ Reward Calculation ============
    /// @notice Calculate reward based on prize level
    /// @param level The encrypted prize level
    /// @return reward The encrypted reward amount
    function calculateReward(euint32 level) private returns (euint32) {
        // Level 0: 0 reward
        // Level 1: 10 tokens
        // Level 2: 50 tokens
        // Level 3: 100 tokens
        
        ebool isLevel1 = FHE.eq(level, FHE.asEuint32(1));
        ebool isLevel2 = FHE.eq(level, FHE.asEuint32(2));
        ebool isLevel3 = FHE.eq(level, FHE.asEuint32(3));
        
        euint32 reward1 = FHE.select(isLevel1, FHE.asEuint32(10), FHE.asEuint32(0));
        euint32 reward2 = FHE.select(isLevel2, FHE.asEuint32(50), reward1);
        euint32 reward3 = FHE.select(isLevel3, FHE.asEuint32(100), reward2);
        
        return reward3;
    }
    
    // ============ Activity System ============
    /// @notice Apply activity multiplier if activity is active
    /// @param baseReward The base encrypted reward
    /// @return finalReward The final encrypted reward with multiplier applied
    function applyActivityMultiplier(euint32 baseReward) private returns (euint32) {
        // Check all activities to find active ones
        euint32 multiplier = FHE.asEuint32(1); // Default multiplier
        
        for (uint256 i = 0; i < _activityCounter; i++) {
            Activity storage activity = _activities[i];
            if (activity.isActive && 
                block.timestamp >= activity.startTime && 
                block.timestamp <= activity.endTime) {
                // Activity is active, use its multiplier
                multiplier = activity.multiplier;
                break;
            }
        }
        
        // Apply multiplier: finalReward = baseReward * multiplier
        return FHE.mul(baseReward, multiplier);
    }
    
    /// @notice Create a new activity (owner only)
    /// @param startTime Activity start timestamp
    /// @param endTime Activity end timestamp
    /// @param multiplier Encrypted multiplier for rewards
    /// @param multiplierProof Proof for the encrypted multiplier
    /// @return activityId The ID of the created activity
    function createActivity(
        uint256 startTime,
        uint256 endTime,
        externalEuint32 multiplier,
        bytes calldata multiplierProof
    ) external onlyOwner returns (uint256 activityId) {
        require(startTime < endTime, "Invalid time range");
        require(endTime > block.timestamp, "End time must be in future");
        
        euint32 encryptedMultiplier = FHE.fromExternal(multiplier, multiplierProof);
        
        activityId = _activityCounter;
        _activities[activityId] = Activity({
            startTime: startTime,
            endTime: endTime,
            multiplier: encryptedMultiplier,
            isActive: true
        });
        
        _activityCounter++;
        
        emit ActivityCreated(activityId, startTime, endTime);
        
        return activityId;
    }
    
    /// @notice Update activity status (owner only)
    /// @param activityId The activity ID
    /// @param isActive New activity status
    function updateActivity(uint256 activityId, bool isActive) external onlyOwner {
        require(_activities[activityId].startTime > 0, "Activity not found");
        _activities[activityId].isActive = isActive;
        emit ActivityUpdated(activityId, isActive);
    }
    
    // ============ User Statistics ============
    /// @notice Update user statistics after a spin
    /// @param user The user address
    /// @param level The encrypted prize level
    /// @param reward The encrypted reward
    function updateUserStats(
        address user,
        euint32 level,
        euint32 reward
    ) private {
        UserStats storage stats = _userStats[user];
        
        // Increment total spins
        stats.totalSpins = FHE.add(stats.totalSpins, FHE.asEuint32(1));
        
        // Check if user won (level > 0)
        ebool isWin = FHE.gt(level, FHE.asEuint32(0));
        euint32 winIncrement = FHE.select(isWin, FHE.asEuint32(1), FHE.asEuint32(0));
        stats.totalWins = FHE.add(stats.totalWins, winIncrement);
        
        // Add reward to total rewards
        stats.totalRewards = FHE.add(stats.totalRewards, reward);
        
        // Set ACL permissions
        FHE.allowThis(stats.totalSpins);
        FHE.allow(stats.totalSpins, user);
        FHE.allowThis(stats.totalWins);
        FHE.allow(stats.totalWins, user);
        FHE.allowThis(stats.totalRewards);
        FHE.allow(stats.totalRewards, user);
    }
    
    // ============ View Functions ============
    /// @notice Get user's current reward
    /// @return level The encrypted prize level
    /// @return reward The encrypted reward amount
    function getUserReward() external view returns (euint32 level, euint32 reward) {
        PrizePool memory pool = _userRewards[msg.sender];
        return (pool.level, pool.reward);
    }
    
    /// @notice Get user's encrypted random result from the last spin
    /// @return randomResult The encrypted random result
    function getUserRandomResult() external view returns (euint32 randomResult) {
        return _userRandomResults[msg.sender];
    }
    
    /// @notice Get user's spin history count
    /// @return count The number of spin records
    function getUserHistoryCount() external view returns (uint256) {
        return _userHistory[msg.sender].length;
    }
    
    /// @notice Get a specific spin record
    /// @param index The index of the record
    /// @return record The encrypted spin record
    function getUserHistoryRecord(uint256 index) external view returns (SpinRecord memory record) {
        require(index < _userHistory[msg.sender].length, "Index out of bounds");
        return _userHistory[msg.sender][index];
    }
    
    /// @notice Get user statistics
    /// @return stats The encrypted user statistics
    function getUserStats() external view returns (UserStats memory stats) {
        return _userStats[msg.sender];
    }
    
    /// @notice Get activity information
    /// @param activityId The activity ID
    /// @return startTime Activity start time
    /// @return endTime Activity end time
    /// @return multiplier Encrypted multiplier
    /// @return isActive Activity status
    function getActivity(uint256 activityId) external view returns (
        uint256 startTime,
        uint256 endTime,
        euint32 multiplier,
        bool isActive
    ) {
        Activity memory activity = _activities[activityId];
        return (
            activity.startTime,
            activity.endTime,
            activity.multiplier,
            activity.isActive
        );
    }
    
    /// @notice Get total number of activities
    /// @return count The number of activities
    function getActivityCount() external view returns (uint256) {
        return _activityCounter;
    }
}

