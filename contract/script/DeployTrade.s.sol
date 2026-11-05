// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {SqueekTrade} from "../contracts/SqueekTrade.sol";
contract DeployTrade is Script {
    function run() external returns (SqueekTrade deployed) {
        require(block.chainid == 11155111, "Sepolia only");
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);
        deployed = new SqueekTrade(0xC4C7982657f00509548F3a3a41db7FA439a6856B, 0xd78a3956cF63164d1Fa1C622ad3c66623162Fa1e, vm.addr(key));
        vm.stopBroadcast();
    }
}
