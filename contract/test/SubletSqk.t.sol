// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {SubletSqk} from "../contracts/SubletSqk.sol";

contract MockNFT is ERC721 {
    constructor() ERC721("Test Squeek", "TSQ") {}
    function mint(address to, uint256 id) external { _mint(to, id); }
}
contract MockSQK is ERC20 {
    bool public attack;
    bool public reentrySucceeded;
    bytes4 public reentryError;
    bool public chargeTax;
    SubletSqk public target;
    constructor() ERC20("Test SQK", "SQK") {}
    function mint(address to, uint256 value) external { _mint(to, value); }
    function arm(SubletSqk value) external { target = value; attack = true; }
    function tax() external { chargeTax = true; }
    function reenter(bytes memory callData) private {
        bytes memory result;
        (reentrySucceeded, result) = address(target).call(callData);
        if (result.length >= 4) reentryError = bytes4(result);
    }
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (attack) { attack = false; reenter(abi.encodeCall(target.rent, (1, 1, 100 ether, 1))); }
        bool success = super.transferFrom(from, to, value);
        if (chargeTax && value > 0) _burn(to, 1);
        return success;
    }
    function transfer(address to, uint256 value) public override returns (bool) {
        if (attack) { attack = false; reenter(abi.encodeCall(target.claim, ())); }
        return super.transfer(to, value);
    }
}
contract ReenteringOwner is IERC721Receiver {
    SubletSqk public market;
    bool public reentrySucceeded;
    constructor(SubletSqk m) { market = m; }
    function list(MockNFT nft) external { nft.approve(address(market), 2); market.list(2, 1 ether, 1, 7); }
    function withdraw() external { market.withdraw(2); }
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        (reentrySucceeded,) = address(market).call(abi.encodeCall(market.withdraw, (2)));
        return this.onERC721Received.selector;
    }
}
contract SubletSqkTest is Test {
    MockNFT nft;
    MockSQK sqk;
    SubletSqk market;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address treasury = makeAddr("treasury");
    function setUp() public {
        vm.chainId(11155111);
        nft = new MockNFT(); sqk = new MockSQK();
        market = new SubletSqk(address(nft), address(sqk), treasury, address(this));
        nft.mint(alice, 1); sqk.mint(bob, type(uint128).max);
        vm.prank(alice); nft.approve(address(market), 1);
        vm.prank(bob); sqk.approve(address(market), type(uint256).max);
    }
    function list() internal { vm.prank(alice); market.list(1, 100 ether, 1, 30); }
    function rent() internal { vm.prank(bob); market.rent(1, 2, 200 ether, 1); }
    function testListDelistWithdraw() public {
        list(); assertEq(nft.ownerOf(1), address(market));
        assertEq(market.tokenCount(), 1); assertEq(market.tokenPage(0, 100)[0], 1);
        vm.prank(alice); market.delist(1);
        vm.prank(bob); vm.expectRevert(SubletSqk.Unavailable.selector); market.rent(1, 1, 100 ether, 1);
        vm.prank(alice); market.withdraw(1); assertEq(nft.ownerOf(1), alice);
    }
    function testRentSplitAndClaim() public {
        list(); rent();
        assertTrue(market.isUsable(1, bob)); assertFalse(market.isUsable(1, alice));
        assertEq(market.earnings(alice), 190 ether); assertEq(market.earnings(treasury), 10 ether);
        assertEq(market.totalLiability(), 200 ether);
        vm.prank(alice); market.claim(); vm.prank(treasury); market.claim();
        assertEq(sqk.balanceOf(alice), 190 ether); assertEq(market.totalLiability(), 0);
        vm.prank(alice); vm.expectRevert(SubletSqk.NothingToClaim.selector); market.claim();
    }
    function testActiveRentalBlocksRentDelistWithdraw() public {
        list(); rent();
        vm.prank(bob); vm.expectRevert(SubletSqk.Unavailable.selector); market.rent(1, 1, 100 ether, 1);
        vm.startPrank(alice);
        vm.expectRevert(SubletSqk.ActiveRental.selector); market.withdraw(1);
        vm.expectRevert(SubletSqk.ActiveRental.selector); market.delist(1);
        vm.stopPrank();
    }
    function testExpiryExactBoundaryAndRelist() public {
        list(); rent(); vm.warp(block.timestamp + 2 days - 1); assertTrue(market.isUsable(1, bob));
        vm.warp(block.timestamp + 1); assertFalse(market.isUsable(1, bob));
        vm.prank(alice); market.withdraw(1); assertEq(nft.ownerOf(1), alice);
        vm.startPrank(alice); nft.approve(address(market), 1); market.list(1, 100 ether, 1, 30); vm.stopPrank();
        assertEq(market.tokenCount(), 1);
        vm.prank(bob); vm.expectRevert(SubletSqk.StaleQuote.selector); market.rent(1, 1, 100 ether, 1);
    }
    function testFeeCapAndSnapshot() public {
        vm.expectRevert(SubletSqk.InvalidInput.selector); market.setFeeBps(1001);
        list(); market.setFeeBps(1000); rent(); assertEq(market.earnings(treasury), 10 ether);
    }
    function testPauseAllowsExitAndClaims() public {
        list(); rent(); market.setPaused(true);
        vm.prank(alice); market.claim();
        vm.prank(bob); vm.expectRevert(SubletSqk.MarketPaused.selector); market.rent(1, 1, 100 ether, 1);
        vm.warp(block.timestamp + 2 days); vm.prank(alice); market.withdraw(1);
        vm.startPrank(alice); nft.approve(address(market), 1);
        vm.expectRevert(SubletSqk.MarketPaused.selector); market.list(1, 1 ether, 1, 2); vm.stopPrank();
    }
    function testPauseAllowsDelistAndUnrentedWithdraw() public {
        list(); market.setPaused(true); vm.startPrank(alice); market.delist(1); market.withdraw(1); vm.stopPrank();
        assertEq(nft.ownerOf(1), alice);
    }
    function testUnauthorizedAndDirectSafeDeposit() public {
        vm.prank(alice); vm.expectRevert(SubletSqk.UnexpectedDeposit.selector); nft.safeTransferFrom(alice, address(market), 1);
        list(); vm.prank(bob); vm.expectRevert(SubletSqk.Unauthorized.selector); market.withdraw(1);
        vm.prank(bob); vm.expectRevert(); market.setFeeBps(0);
    }
    function testReentryDuringPaymentAndClaim() public {
        list(); sqk.arm(market); rent(); assertFalse(sqk.reentrySucceeded());
        assertEq(sqk.reentryError(), bytes4(keccak256("ReentrancyGuardReentrantCall()")));
        sqk.arm(market); vm.prank(alice); market.claim(); assertFalse(sqk.reentrySucceeded());
        assertEq(sqk.reentryError(), bytes4(keccak256("ReentrancyGuardReentrantCall()")));
        assertEq(market.totalLiability(), 10 ether);
    }
    function testReentryDuringNFTWithdrawal() public {
        ReenteringOwner evil = new ReenteringOwner(market); nft.mint(address(evil), 2); evil.list(nft); evil.withdraw();
        assertFalse(evil.reentrySucceeded()); assertEq(nft.ownerOf(2), address(evil));
    }
    function testInvalidDurationAndQuote() public {
        list(); vm.startPrank(bob);
        vm.expectRevert(SubletSqk.InvalidInput.selector); market.rent(1, 0, 0, 1);
        vm.expectRevert(SubletSqk.InvalidInput.selector); market.rent(1, 31, 3100 ether, 1);
        vm.expectRevert(SubletSqk.StaleQuote.selector); market.rent(1, 2, 1, 1); vm.stopPrank();
    }
    function testFuzzPriceDaysAndFee(uint128 price, uint16 daysCount, uint16 fee) public {
        price = uint128(bound(price, 1, type(uint112).max)); daysCount = uint16(bound(daysCount, 1, 365)); fee = uint16(bound(fee, 0, 1000));
        market.setFeeBps(fee); vm.prank(alice); market.list(1, price, 1, 365);
        uint256 total = uint256(price) * daysCount;
        vm.prank(bob); market.rent(1, daysCount, total, 1);
        assertEq(market.earnings(treasury), total * fee / 10000);
        assertEq(market.earnings(alice) + market.earnings(treasury), total);
        assertEq(sqk.balanceOf(address(market)), market.totalLiability());
    }
    function testOnlySepolia() public {
        vm.chainId(1); vm.expectRevert(SubletSqk.InvalidInput.selector);
        new SubletSqk(address(nft), address(sqk), treasury, address(this));
    }
    function testTaxedPaymentRollsBackAllCreditsAndRights() public {
        list(); sqk.tax(); vm.prank(bob); vm.expectRevert(SubletSqk.UnsupportedPayment.selector);
        market.rent(1, 1, 100 ether, 1);
        assertEq(market.totalLiability(), 0); assertEq(market.earnings(alice), 0);
        assertFalse(market.isUsable(1, bob)); assertEq(sqk.balanceOf(address(market)), 0);
        (,,,,,bool listed,,,) = market.listings(1); assertTrue(listed);
    }
    function testNoAllowanceRollsBackRental() public {
        list(); vm.startPrank(bob); sqk.approve(address(market), 0);
        vm.expectRevert(); market.rent(1, 1, 100 ether, 1); vm.stopPrank();
        assertEq(market.totalLiability(), 0); assertFalse(market.isUsable(1, bob));
    }
    function testAdminCannotWithdrawUsersNFTOrClaimTheirMoney() public {
        list(); rent(); vm.warp(block.timestamp + 2 days);
        vm.expectRevert(SubletSqk.Unauthorized.selector); market.withdraw(1);
        vm.expectRevert(SubletSqk.NothingToClaim.selector); market.claim();
        assertEq(market.earnings(alice), 190 ether);
    }
    function testTwoStepAdministration() public {
        market.transferOwnership(alice); assertEq(market.owner(), address(this));
        vm.prank(bob); vm.expectRevert(); market.acceptOwnership();
        vm.prank(alice); market.acceptOwnership(); assertEq(market.owner(), alice);
    }
}
