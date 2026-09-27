// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMandateVault {
    function refund(uint256 mandateId, uint256 amount) external;
}

interface IERC20Escrow {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IReputationRegistry {
    function giveFeedback(address agent, int128 value, string calldata tag) external;
}

contract AmanatEscrow {
    error NotValidator();
    error NotVault(); // FIX: guards openDeal
    error AlreadyResolved();
    error ChallengeOpen();
    error InvalidDeal();
    error TransferFailed();
    error Reentrancy();

    enum Outcome { Open, Released, Refunded }
    struct Deal {
        uint256 mandateId;
        address owner; // FIX: the mandate owner, credited on a refund
        address seller;
        uint256 amount;
        uint256 challengeEndsAt;
        Outcome outcome;
    }

    IERC20Escrow public immutable usdc;
    IMandateVault public immutable vault; // FIX: known at deploy time, used to gate openDeal
    IReputationRegistry public immutable reputation;
    address public immutable validator;
    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) public deals;
    uint256 private _lock = 1;

    event EscrowOpened(uint256 indexed dealId, uint256 indexed mandateId, address seller, uint256 amount);
    event EscrowResolved(uint256 indexed dealId, Outcome outcome, int128 reputationDelta);

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address usdcAddress, address vaultAddress, address validatorAddress, address reputationAddress) {
        usdc = IERC20Escrow(usdcAddress);
        vault = IMandateVault(vaultAddress);
        validator = validatorAddress;
        reputation = IReputationRegistry(reputationAddress);
    }

    /// @notice FIX #3 (part 2): only the vault can open a deal, and only after it has already
    /// transferred the USDC here. This is what makes a deal correspond to a real, capped payment
    /// instead of an arbitrary unauthenticated claim.
    function openDeal(uint256 mandateId, address owner, address seller, uint256 amount, uint256 challengeWindow)
        external
        returns (uint256 dealId)
    {
        if (msg.sender != address(vault)) revert NotVault();
        if (seller == address(0) || amount == 0) revert InvalidDeal();
        dealId = nextDealId++;
        deals[dealId] = Deal(mandateId, owner, seller, amount, block.timestamp + challengeWindow, Outcome.Open);
        emit EscrowOpened(dealId, mandateId, seller, amount);
    }

    function resolve(uint256 dealId, bool passed, string calldata tag) external nonReentrant {
        if (msg.sender != validator) revert NotValidator();
        Deal storage deal = deals[dealId];
        if (deal.outcome != Outcome.Open) revert AlreadyResolved();
        if (block.timestamp < deal.challengeEndsAt) revert ChallengeOpen();

        // FIX: state is finalized and the event is emitted before any external call, so a
        // reentrant call from usdc.transfer / reputation.giveFeedback / vault.refund hits
        // AlreadyResolved and cannot reorder or duplicate this outcome.
        if (passed) {
            deal.outcome = Outcome.Released;
            emit EscrowResolved(dealId, Outcome.Released, 1);
            if (!usdc.transfer(deal.seller, deal.amount)) revert TransferFailed(); // FIX: checked
            reputation.giveFeedback(deal.seller, 1, tag);
        } else {
            deal.outcome = Outcome.Refunded;
            emit EscrowResolved(dealId, Outcome.Refunded, -1);
            vault.refund(deal.mandateId, deal.amount);
            reputation.giveFeedback(deal.seller, -1, tag);
        }
    }
}
