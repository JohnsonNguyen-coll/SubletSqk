// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {SqueekTrade} from "../contracts/SqueekTrade.sol";
contract DeployTrade is Script {
    function run() external returns (SqueekTrade deployed) {
        require(block.chainid == 11155111, "Sepolia only");
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);
        deployed = new SqueekTrade(0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6, 0x6872BfA5CcC3E9e440C6c16e5fFdAbb8DBA4Cc76, vm.addr(key));
        vm.stopBroadcast();
    }
}
