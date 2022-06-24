// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

contract ProxyUUPS is Proxy, ERC1967UpgradeUpgradeable {
    function initProxy(address _logic, bytes memory _data) public initializer {
        _upgradeToAndCall(_logic, _data, false);
    }

    /**
     * @dev Returns the current implementation address.
     */
    function getImplementation() external view returns (address) {
        return _implementation();
    }

    /**
     * @dev Returns the current implementation address.
     */
    function _implementation() internal view virtual override returns (address impl) {
        return ERC1967UpgradeUpgradeable._getImplementation();
    }    
}