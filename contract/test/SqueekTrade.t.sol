// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {SqueekTrade} from "../contracts/SqueekTrade.sol";

contract TradeNFT is ERC721, IERC2981 {
    address public royaltyReceiver;
    constructor(address receiver) ERC721("Squeek", "SQK-NFT") { royaltyReceiver = receiver; }
    function mint(address to, uint256 id) external { _mint(to, id); }
    function royaltyInfo(uint256, uint256 price) external view returns (address, uint256) { return (royaltyReceiver, price * 500 / 10000); }
    function supportsInterface(bytes4 id) public view override(ERC721, IERC165) returns (bool) { return id == type(IERC2981).interfaceId || super.supportsInterface(id); }
}
contract TradeSQK is ERC20 {
    bool public tax;
    constructor() ERC20("SQK", "SQK") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function setTax(bool value) external { tax = value; }
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        bool ok = super.transferFrom(from, to, amount);
        if (tax) _burn(to, 1);
        return ok;
    }
}
contract TradeBuyer is IERC721Receiver {
    SqueekTrade public market;
    bool public reentered;
    constructor(SqueekTrade value) { market = value; }
    function buy(uint256 id, uint256 price, uint256 nonce) external { market.buy(id, price, nonce); }
    function onERC721Received(address, address, uint256 id, bytes calldata) external returns (bytes4) {
        (reentered,) = address(market).call(abi.encodeCall(market.buy, (id, 100 ether, 1)));
        return IERC721Receiver.onERC721Received.selector;
    }
}
contract SqueekTradeTest is Test {
    TradeNFT nft;
    TradeSQK sqk;
    SqueekTrade market;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address royalty = makeAddr("royalty");
    function setUp() public {
        vm.chainId(11155111);
        nft = new TradeNFT(royalty);
        sqk = new TradeSQK();
        market = new SqueekTrade(address(nft), address(sqk), address(this));
        nft.mint(alice, 1);
        sqk.mint(bob, 1000 ether);
        vm.prank(alice); nft.approve(address(market), 1);
        vm.prank(bob); sqk.approve(address(market), type(uint256).max);
    }
    function list() internal { vm.prank(alice); market.list(1, 100 ether); }
    function testListCancelRelist() public {
        list(); assertEq(nft.ownerOf(1), address(market)); assertEq(market.tokenPage(0, 100)[0], 1);
        vm.prank(alice); market.cancel(1); assertEq(nft.ownerOf(1), alice);
        vm.prank(alice); nft.approve(address(market), 1);
        list(); assertEq(market.tokenCount(), 1); assertEq(market.nonce(), 2);
        vm.prank(bob); vm.expectRevert(SqueekTrade.StaleQuote.selector); market.buy(1, 100 ether, 1);
    }
    function testBuyRoyaltyClaim() public {
        list(); vm.prank(bob); market.buy(1, 100 ether, 1);
        assertEq(nft.ownerOf(1), bob);
        assertEq(market.earnings(alice), 95 ether); assertEq(market.earnings(royalty), 5 ether);
        assertEq(market.totalLiability(), 100 ether);
        vm.prank(alice); market.claim(); vm.prank(royalty); market.claim();
        assertEq(sqk.balanceOf(alice), 95 ether); assertEq(sqk.balanceOf(royalty), 5 ether);
        assertEq(market.totalLiability(), 0);
    }
    function testPauseLeavesCancelClaimOpen() public {
        list(); market.setPaused(true);
        vm.prank(bob); vm.expectRevert(SqueekTrade.MarketPaused.selector); market.buy(1, 100 ether, 1);
        vm.prank(alice); market.cancel(1);
        market.setPaused(false); vm.prank(alice); nft.approve(address(market), 1); list();
        vm.prank(bob); market.buy(1, 100 ether, 2); market.setPaused(true);
        vm.prank(alice); market.claim(); assertEq(sqk.balanceOf(alice), 95 ether);
    }
    function testBuyerCallbackCannotReenter() public {
        TradeBuyer buyer = new TradeBuyer(market);
        sqk.mint(address(buyer), 100 ether);
        vm.prank(address(buyer)); sqk.approve(address(market), 100 ether);
        list(); buyer.buy(1, 100 ether, 1);
        assertFalse(buyer.reentered()); assertEq(nft.ownerOf(1), address(buyer));
    }
    function testTaxTokenRejected() public {
        list(); sqk.setTax(true);
        vm.prank(bob); vm.expectRevert(SqueekTrade.UnsupportedPayment.selector); market.buy(1, 100 ether, 1);
        assertEq(nft.ownerOf(1), address(market));
    }
    function testQuoteAndAuthorization() public {
        vm.prank(bob); vm.expectRevert(SqueekTrade.Unauthorized.selector); market.list(1, 100 ether);
        list();
        vm.prank(bob); vm.expectRevert(SqueekTrade.Unauthorized.selector); market.cancel(1);
        vm.prank(alice); vm.expectRevert(SqueekTrade.Unavailable.selector); market.buy(1, 100 ether, 1);
        vm.prank(bob); vm.expectRevert(SqueekTrade.StaleQuote.selector); market.buy(1, 99 ether, 1);
        vm.prank(bob); vm.expectRevert(SqueekTrade.StaleQuote.selector); market.buy(1, 100 ether, 2);
    }
    function testPauseBlocksNewListings() public {
        market.setPaused(true);
        vm.prank(alice); vm.expectRevert(SqueekTrade.MarketPaused.selector); market.list(1, 100 ether);
    }
    function testDirectSafeDepositRejected() public {
        vm.prank(alice); vm.expectRevert(SqueekTrade.UnexpectedDeposit.selector);
        nft.safeTransferFrom(alice, address(market), 1);
        assertEq(nft.ownerOf(1), alice);
    }
    function testOnlySepolia() public {
        vm.chainId(1);
        vm.expectRevert(SqueekTrade.InvalidInput.selector);
        new SqueekTrade(address(nft), address(sqk), address(this));
    }
    function testFuzzPrice(uint128 raw) public {
        uint128 price = uint128(bound(raw, 1, 1000 ether));
        vm.prank(alice); market.list(1, price);
        vm.prank(bob); market.buy(1, price, 1);
        uint256 royaltyAmount = uint256(price) * 500 / 10000;
        assertEq(market.earnings(alice), uint256(price) - royaltyAmount);
        assertEq(market.earnings(royalty), royaltyAmount);
    }
}
