// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Fixed-price Squeek sales on Sepolia. Prices and royalties are denominated in SQK.
/// @dev Listing escrows the NFT; seller and royalty receiver withdraw proceeds independently.
contract SqueekTrade is Ownable2Step, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;
    IERC721 public immutable nft;
    IERC20 public immutable sqk;
    bool public paused;
    uint256 public totalLiability;
    uint256 public nonce;
    struct Sale { address seller; uint128 price; uint256 nonce; }
    mapping(uint256 => Sale) public sales;
    mapping(address => uint256) public earnings;
    uint256[] private tokens;
    mapping(uint256 => bool) private seen;
    address private depositingSeller;
    uint256 private depositingToken;

    error InvalidInput();
    error Unauthorized();
    error Unavailable();
    error MarketPaused();
    error StaleQuote();
    error UnexpectedDeposit();
    error UnsupportedPayment();
    error NothingToClaim();
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 nonce);
    event Cancelled(uint256 indexed tokenId, address indexed seller);
    event Purchased(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, address royaltyReceiver, uint256 royalty);
    event Claimed(address indexed account, uint256 amount);
    event PauseUpdated(bool paused);

    constructor(address nft_, address sqk_, address admin_) Ownable(admin_) {
        if (block.chainid != 11155111 || nft_.code.length == 0 || sqk_.code.length == 0) revert InvalidInput();
        nft = IERC721(nft_);
        sqk = IERC20(sqk_);
    }
    modifier whenOpen() { if (paused) revert MarketPaused(); _; }
    function setPaused(bool value) external onlyOwner { paused = value; emit PauseUpdated(value); }

    function list(uint256 tokenId, uint128 price) external nonReentrant whenOpen {
        if (price == 0) revert InvalidInput();
        if (sales[tokenId].seller != address(0)) revert Unavailable();
        if (nft.ownerOf(tokenId) != msg.sender) revert Unauthorized();
        uint256 next = ++nonce;
        sales[tokenId] = Sale(msg.sender, price, next);
        if (!seen[tokenId]) { seen[tokenId] = true; tokens.push(tokenId); }
        depositingSeller = msg.sender;
        depositingToken = tokenId;
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        if (depositingSeller != address(0) || nft.ownerOf(tokenId) != address(this)) revert UnexpectedDeposit();
        emit Listed(tokenId, msg.sender, price, next);
    }

    function cancel(uint256 tokenId) external nonReentrant {
        Sale memory sale = sales[tokenId];
        if (sale.seller != msg.sender) revert Unauthorized();
        delete sales[tokenId];
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Cancelled(tokenId, msg.sender);
    }

    /// @param maxPrice Prevents paying more than the price the buyer reviewed.
    /// @param expectedNonce Prevents executing a listing that has since been replaced.
    function buy(uint256 tokenId, uint256 maxPrice, uint256 expectedNonce) external nonReentrant whenOpen {
        Sale memory sale = sales[tokenId];
        if (sale.seller == address(0) || sale.seller == msg.sender) revert Unavailable();
        if (sale.nonce != expectedNonce || sale.price > maxPrice) revert StaleQuote();
        (address receiver, uint256 royalty) = IERC2981(address(nft)).royaltyInfo(tokenId, sale.price);
        if (royalty > sale.price || (royalty != 0 && receiver == address(0))) revert InvalidInput();
        delete sales[tokenId];
        earnings[sale.seller] += uint256(sale.price) - royalty;
        if (royalty != 0) earnings[receiver] += royalty;
        totalLiability += sale.price;
        uint256 beforeBalance = sqk.balanceOf(address(this));
        sqk.safeTransferFrom(msg.sender, address(this), sale.price);
        if (sqk.balanceOf(address(this)) != beforeBalance + sale.price) revert UnsupportedPayment();
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Purchased(tokenId, sale.seller, msg.sender, sale.price, receiver, royalty);
    }

    function claim() external nonReentrant {
        uint256 amount = earnings[msg.sender];
        if (amount == 0) revert NothingToClaim();
        earnings[msg.sender] = 0;
        totalLiability -= amount;
        sqk.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }
    function tokenCount() external view returns (uint256) { return tokens.length; }
    function tokenPage(uint256 cursor, uint256 size) external view returns (uint256[] memory page) {
        if (size == 0 || size > 100 || cursor > tokens.length) revert InvalidInput();
        uint256 end = cursor + size;
        if (end > tokens.length) end = tokens.length;
        page = new uint256[](end - cursor);
        for (uint256 i = cursor; i < end; ++i) page[i - cursor] = tokens[i];
    }
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata) external returns (bytes4) {
        if (msg.sender != address(nft) || operator != address(this) || from != depositingSeller || from == address(0) || tokenId != depositingToken) revert UnexpectedDeposit();
        depositingSeller = address(0);
        return IERC721Receiver.onERC721Received.selector;
    }
}
