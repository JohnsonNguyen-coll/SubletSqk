// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Sepolia-only, immutable NFT escrow and temporary usage registry.
/// @dev Does not grant SqueekMining owner rights. Depositor retains withdrawal entitlement.
contract SubletSqk is Ownable2Step, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;
    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public constant MAX_DAYS = 365;
    IERC721 public immutable nft;
    IERC20 public immutable sqk;
    address public immutable treasury;
    uint16 public feeBps = 500;
    bool public paused;
    uint256 public totalLiability;
    struct Listing {
        address owner;
        uint128 pricePerDay;
        uint16 minDays;
        uint16 maxDays;
        uint16 feeBps;
        bool listed;
        address renter;
        uint64 expiresAt;
        uint256 nonce;
    }
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public earnings;
    uint256[] private tokens;
    mapping(uint256 => bool) private seen;
    uint256 private nonce;
    address private depositingOwner;
    uint256 private depositingToken;

    error InvalidInput();
    error Unauthorized();
    error Unavailable();
    error ActiveRental();
    error MarketPaused();
    error StaleQuote();
    error UnexpectedDeposit();
    error UnsupportedPayment();
    error NothingToClaim();
    event Listed(uint256 indexed tokenId, address indexed owner, uint256 pricePerDay, uint16 minDays, uint16 maxDays, uint16 feeBps, uint256 nonce);
    event Delisted(uint256 indexed tokenId, address indexed owner);
    event Rented(uint256 indexed tokenId, address indexed renter, address indexed owner, uint16 daysCount, uint64 expiresAt, uint256 total, uint256 protocolFee);
    event Claimed(address indexed account, uint256 amount);
    event Withdrawn(uint256 indexed tokenId, address indexed owner);
    event FeeUpdated(uint16 feeBps);
    event PauseUpdated(bool paused);

    constructor(address nft_, address sqk_, address treasury_, address admin_) Ownable(admin_) {
        if (block.chainid != 11155111 || nft_.code.length == 0 || sqk_.code.length == 0 || treasury_ == address(0)) revert InvalidInput();
        nft = IERC721(nft_);
        sqk = IERC20(sqk_);
        treasury = treasury_;
    }
    modifier whenOpen() {
        if (paused) revert MarketPaused();
        _;
    }
    function setFeeBps(uint16 fee) external onlyOwner {
        if (fee > MAX_FEE_BPS) revert InvalidInput();
        feeBps = fee;
        emit FeeUpdated(fee);
    }
    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PauseUpdated(value);
    }
    function list(uint256 tokenId, uint128 price, uint16 minDays, uint16 maxDays) external nonReentrant whenOpen {
        if (price == 0 || minDays == 0 || minDays > maxDays || maxDays > MAX_DAYS) revert InvalidInput();
        if (listings[tokenId].owner != address(0)) revert Unavailable();
        if (nft.ownerOf(tokenId) != msg.sender) revert Unauthorized();
        listings[tokenId] = Listing(msg.sender, price, minDays, maxDays, feeBps, true, address(0), 0, ++nonce);
        if (!seen[tokenId]) { seen[tokenId] = true; tokens.push(tokenId); }
        depositingOwner = msg.sender;
        depositingToken = tokenId;
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        if (depositingOwner != address(0) || nft.ownerOf(tokenId) != address(this)) revert UnexpectedDeposit();
        emit Listed(tokenId, msg.sender, price, minDays, maxDays, feeBps, nonce);
    }
    function delist(uint256 tokenId) external nonReentrant {
        Listing storage l = listings[tokenId];
        if (l.owner != msg.sender) revert Unauthorized();
        if (block.timestamp < l.expiresAt) revert ActiveRental();
        if (!l.listed) revert Unavailable();
        l.listed = false;
        emit Delisted(tokenId, msg.sender);
    }
    /// @dev A nonce and maximum total bind wallet approval to the displayed listing.
    function rent(uint256 tokenId, uint16 daysCount, uint256 maxTotal, uint256 expectedNonce) external nonReentrant whenOpen {
        Listing storage l = listings[tokenId];
        if (!l.listed || l.owner == address(0) || l.owner == msg.sender) revert Unavailable();
        if (block.timestamp < l.expiresAt) revert ActiveRental();
        if (daysCount < l.minDays || daysCount > l.maxDays) revert InvalidInput();
        uint256 total = uint256(l.pricePerDay) * daysCount;
        if (l.nonce != expectedNonce || total > maxTotal) revert StaleQuote();
        uint256 fee = total * l.feeBps / 10000;
        l.renter = msg.sender;
        l.expiresAt = uint64(block.timestamp + uint256(daysCount) * 1 days);
        // One rental per listing; owner explicitly withdraws/re-lists after expiry.
        l.listed = false;
        earnings[l.owner] += total - fee;
        earnings[treasury] += fee;
        totalLiability += total;
        uint256 beforeBalance = sqk.balanceOf(address(this));
        sqk.safeTransferFrom(msg.sender, address(this), total);
        if (sqk.balanceOf(address(this)) != beforeBalance + total) revert UnsupportedPayment();
        emit Rented(tokenId, msg.sender, l.owner, daysCount, l.expiresAt, total, fee);
    }
    function isUsable(uint256 tokenId, address account) external view returns (bool) {
        Listing storage l = listings[tokenId];
        return account != address(0) && l.owner != address(0) && l.renter == account && block.timestamp < l.expiresAt;
    }
    function withdraw(uint256 tokenId) external nonReentrant {
        Listing memory l = listings[tokenId];
        if (l.owner != msg.sender) revert Unauthorized();
        if (block.timestamp < l.expiresAt) revert ActiveRental();
        delete listings[tokenId];
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Withdrawn(tokenId, msg.sender);
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
    /// @notice Historical token IDs; inspect listings(id) for current escrow state.
    function tokenPage(uint256 cursor, uint256 size) external view returns (uint256[] memory page) {
        if (size == 0 || size > 100 || cursor > tokens.length) revert InvalidInput();
        uint256 end = cursor + size;
        if (end > tokens.length) end = tokens.length;
        page = new uint256[](end - cursor);
        for (uint256 i = cursor; i < end; ++i) page[i - cursor] = tokens[i];
    }
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata) external returns (bytes4) {
        if (msg.sender != address(nft) || operator != address(this) || from != depositingOwner || from == address(0) || tokenId != depositingToken) revert UnexpectedDeposit();
        depositingOwner = address(0);
        return IERC721Receiver.onERC721Received.selector;
    }
}
