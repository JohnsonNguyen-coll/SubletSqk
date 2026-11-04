// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {SubletSqk} from "../contracts/SubletSqk.sol";
contract Deploy is Script {
    function run() external returns (SubletSqk deployed) {
        require(block.chainid == 11155111, "Sepolia only");
        uint256 key = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(key);
        address treasury = vm.envOr("PROTOCOL_TREASURY", deployer);
        vm.startBroadcast(key);
        deployed = new SubletSqk(0x0eAF3E0d40A0a8E5a6Ac030b2459E9FB0B7905c6, 0x6872BfA5CcC3E9e440C6c16e5fFdAbb8DBA4Cc76, treasury, deployer);
        vm.stopBroadcast();
    }
}
