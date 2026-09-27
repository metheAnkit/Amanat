// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IAmanatEscrow {
    function openDeal(uint256 mandateId, address owner, address seller, uint256 amount, uint256 challengeWindow)
        external
        returns (uint256 dealId);
}

contract MandateVault {
    error NotOwner();
    error NotAgent();
    error NotEscrow();
    error NotAdmin();
    error EscrowAlreadySet();
    error MandateExpired();
    error MandateInactive();
    error SellerNotApproved();
    error TransactionCapExceeded(uint256 requested, uint256 cap);
    error DailyCapExceeded(uint256 requested, uint256 remaining);
    error InsufficientBalance(uint256 requested, uint256 available);
    error ZeroAddress();
    error TransferFailed();
    error Reentrancy();

    struct Mandate {
        address owner;
        address agent; // FIX: only this address may call authorizePayment for this mandate
        uint256 balance;
        uint256 perTransactionCap;
        uint256 dailyCap;
        uint256 spentToday;
        uint256 dayStartedAt;
        uint256 expiresAt;
        bool active;
        mapping(address => bool) approvedSeller;
    }

    IERC20 public immutable usdc;
    address public immutable admin;
    IAmanatEscrow public escrow; // FIX: set once after deploy, see setEscrow()
    uint256 public nextMandateId = 1;
    mapping(uint256 => Mandate) private mandates;
    uint256 private _lock = 1;

    event MandateCreated(uint256 indexed mandateId, address indexed owner, address indexed agent, uint256 expiresAt);
    event MandateFunded(uint256 indexed mandateId, uint256 amount);
    event MandateRevoked(uint256 indexed mandateId);
    event SellerApprovalUpdated(uint256 indexed mandateId, address indexed seller, bool approved);
    event PaymentAuthorized(uint256 indexed mandateId, uint256 indexed dealId, address indexed seller, uint256 amount);
    event Refunded(uint256 indexed mandateId, uint256 amount);

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert ZeroAddress();
        usdc = IERC20(usdcAddress);
        admin = msg.sender;
    }

    /// @notice One-time wiring, called by the deployer once AmanatEscrow exists.
    function setEscrow(address escrowAddress) external {
        if (msg.sender != admin) revert NotAdmin();
        if (address(escrow) != address(0)) revert EscrowAlreadySet();
        if (escrowAddress == address(0)) revert ZeroAddress();
        escrow = IAmanatEscrow(escrowAddress);
    }

    function createMandate(
        address agent, // FIX: the only address allowed to spend this mandate
        uint256 perTransactionCap,
        uint256 dailyCap,
        uint256 expiresAt,
        address[] calldata approvedSellers
    ) external returns (uint256 mandateId) {
        if (agent == address(0)) revert ZeroAddress();
        if (expiresAt <= block.timestamp) revert MandateExpired();
        mandateId = nextMandateId++;
        Mandate storage mandate = mandates[mandateId];
        mandate.owner = msg.sender;
        mandate.agent = agent;
        mandate.perTransactionCap = perTransactionCap;
        mandate.dailyCap = dailyCap;
        mandate.expiresAt = expiresAt;
        mandate.dayStartedAt = block.timestamp;
        mandate.active = true;
        for (uint256 i; i < approvedSellers.length; i++) {
            mandate.approvedSeller[approvedSellers[i]] = true;
            emit SellerApprovalUpdated(mandateId, approvedSellers[i], true);
        }
        emit MandateCreated(mandateId, msg.sender, agent, expiresAt);
    }

    function revokeMandate(uint256 mandateId) external {
        Mandate storage mandate = mandates[mandateId];
        if (mandate.owner != msg.sender) revert NotOwner();
        mandate.active = false;
        emit MandateRevoked(mandateId);
    }

    function fund(uint256 mandateId, uint256 amount) external nonReentrant {
        Mandate storage mandate = mandates[mandateId];
        if (mandate.owner != msg.sender) revert NotOwner();
        mandate.balance += amount;
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit MandateFunded(mandateId, amount);
    }

    /// @notice FIX: now checks msg.sender is the mandate's agent, and actually moves USDC into
    /// escrow instead of only updating an internal number.
    function authorizePayment(uint256 mandateId, address seller, uint256 amount, uint256 challengeWindow)
        external
        nonReentrant
        returns (uint256 dealId)
    {
        Mandate storage mandate = mandates[mandateId];
        if (msg.sender != mandate.agent) revert NotAgent(); // FIX #1
        if (!mandate.active) revert MandateInactive();
        if (block.timestamp > mandate.expiresAt) revert MandateExpired();
        if (!mandate.approvedSeller[seller]) revert SellerNotApproved();
        if (amount > mandate.perTransactionCap) {
            revert TransactionCapExceeded(amount, mandate.perTransactionCap);
        }
        if (block.timestamp >= mandate.dayStartedAt + 1 days) {
            mandate.spentToday = 0;
            mandate.dayStartedAt = block.timestamp;
        }
        if (mandate.spentToday + amount > mandate.dailyCap) {
            revert DailyCapExceeded(amount, mandate.dailyCap - mandate.spentToday);
        }
        if (amount > mandate.balance) revert InsufficientBalance(amount, mandate.balance);

        mandate.balance -= amount;
        mandate.spentToday += amount;

        if (!usdc.transfer(address(escrow), amount)) revert TransferFailed(); // FIX #3: funds actually move
        dealId = escrow.openDeal(mandateId, mandate.owner, seller, amount, challengeWindow);
        emit PaymentAuthorized(mandateId, dealId, seller, amount);
    }

    /// @notice FIX #2: only the escrow contract may credit a refund back to a mandate.
    function refund(uint256 mandateId, uint256 amount) external {
        if (msg.sender != address(escrow)) revert NotEscrow();
        Mandate storage mandate = mandates[mandateId];
        mandate.balance += amount;
        if (mandate.spentToday >= amount) {
            mandate.spentToday -= amount;
        } else {
            mandate.spentToday = 0;
        }
        emit Refunded(mandateId, amount);
    }

    function balanceOf(uint256 mandateId) external view returns (uint256) {
        return mandates[mandateId].balance;
    }

    function mandateRules(uint256 mandateId)
        external
        view
        returns (
            address owner,
            address agent,
            uint256 perTransactionCap,
            uint256 dailyCap,
            uint256 spentToday,
            uint256 expiresAt,
            bool active
        )
    {
        Mandate storage mandate = mandates[mandateId];
        return (
            mandate.owner,
            mandate.agent,
            mandate.perTransactionCap,
            mandate.dailyCap,
            mandate.spentToday,
            mandate.expiresAt,
            mandate.active
        );
    }

    function isApprovedSeller(uint256 mandateId, address seller) external view returns (bool) {
        return mandates[mandateId].approvedSeller[seller];
    }
}
