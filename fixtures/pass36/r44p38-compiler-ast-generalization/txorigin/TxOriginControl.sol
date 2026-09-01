// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../access/Owned.sol";

contract TxOriginControl is Owned {
    function sweep(address payable recipient) external onlyOwner {
        recipient.transfer(address(this).balance);
    }
    receive() external payable {}
}
