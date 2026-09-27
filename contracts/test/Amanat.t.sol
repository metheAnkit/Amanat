// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MandateVault} from "../src/MandateVault.sol";
import {AmanatEscrow} from "../src/AmanatEscrow.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockReputation} from "../src/mocks/MockReputation.sol";

contract FixedContractsTest is Test {
    MockUSDC usdc;
    MockReputation reputation;
    MandateVault vault;
    AmanatEscrow escrow;

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address attacker = makeAddr("attacker");
    address validator = makeAddr("validator");
    address seller = makeAddr("seller");
    uint256 mandateId;

    function setUp() public {
        usdc = new MockUSDC();
        reputation = new MockReputation();
        vault = new MandateVault(address(usdc));
        escrow = new AmanatEscrow(address(usdc), address(vault), validator, address(reputation));
        vault.setEscrow(address(escrow));

        usdc.mint(owner, 10_000_000);
        address[] memory sellers = new address[](1);
        sellers[0] = seller;
        vm.startPrank(owner);
        usdc.approve(address(vault), type(uint256).max);
        mandateId = vault.createMandate(agent, 100_000, 500_000, uint64(block.timestamp + 7 days), sellers);
        vault.fund(mandateId, 1_000_000);
        vm.stopPrank();
    }

    // ---- Bug 1: only the agent could authorize spending ----

    function test_attackerCannotAuthorizePayment() public {
        vm.prank(attacker);
        vm.expectRevert(MandateVault.NotAgent.selector);
        vault.authorizePayment(mandateId, seller, 50_000, 60);
    }

    function test_agentCanAuthorizePayment() public {
        vm.prank(agent);
        uint256 dealId = vault.authorizePayment(mandateId, seller, 50_000, 60);
        assertEq(dealId, 1);
    }

    // ---- Bug 2: refund had no access control ----

    function test_attackerCannotCallRefundDirectly() public {
        vm.prank(attacker);
        vm.expectRevert(MandateVault.NotEscrow.selector);
        vault.refund(mandateId, 999_999);
    }

    function test_onlyEscrowCanCallRefund() public {
        vm.prank(address(escrow));
        vault.refund(mandateId, 10_000);
        assertEq(vault.balanceOf(mandateId), 1_010_000);
    }

    // ---- Bug 3: vault and escrow never actually moved funds ----

    function test_attackerCannotOpenAnArbitraryDeal() public {
        vm.prank(attacker);
        vm.expectRevert(AmanatEscrow.NotVault.selector);
        escrow.openDeal(mandateId, owner, attacker, 1_000_000, 60);
    }

    function test_happyPath_fundsActuallyMoveAndSellerGetsPaid() public {
        vm.prank(agent);
        uint256 dealId = vault.authorizePayment(mandateId, seller, 50_000, 60);

        // The escrow contract now really holds the USDC, not just an internal number.
        assertEq(usdc.balanceOf(address(escrow)), 50_000);
        assertEq(vault.balanceOf(mandateId), 950_000);

        vm.warp(block.timestamp + 61);
        vm.prank(validator);
        escrow.resolve(dealId, true, "ok");

        assertEq(usdc.balanceOf(seller), 50_000);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_failedValidation_refundsTheMandateForReuse() public {
        vm.prank(agent);
        uint256 dealId = vault.authorizePayment(mandateId, seller, 50_000, 60);
        vm.warp(block.timestamp + 61);
        vm.prank(validator);
        escrow.resolve(dealId, false, "bad output");

        assertEq(usdc.balanceOf(seller), 0);
        assertEq(vault.balanceOf(mandateId), 1_000_000); // refunded back into the mandate
    }

    // ---- Existing rules still work after the fix ----

    function test_perTransactionCapStillEnforced() public {
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(MandateVault.TransactionCapExceeded.selector, 100_001, 100_000));
        vault.authorizePayment(mandateId, seller, 100_001, 60);
    }

    function test_unapprovedSellerStillBlocked() public {
        vm.prank(agent);
        vm.expectRevert(MandateVault.SellerNotApproved.selector);
        vault.authorizePayment(mandateId, attacker, 1_000, 60);
    }

    function test_revokedMandateBlocksNewPayments() public {
        vm.prank(owner);
        vault.revokeMandate(mandateId);
        vm.prank(agent);
        vm.expectRevert(MandateVault.MandateInactive.selector);
        vault.authorizePayment(mandateId, seller, 1_000, 60);
    }

    function test_cannotResolveTwice() public {
        vm.prank(agent);
        uint256 dealId = vault.authorizePayment(mandateId, seller, 50_000, 60);
        vm.warp(block.timestamp + 61);
        vm.startPrank(validator);
        escrow.resolve(dealId, true, "ok");
        vm.expectRevert(AmanatEscrow.AlreadyResolved.selector);
        escrow.resolve(dealId, true, "ok");
        vm.stopPrank();
    }
}
