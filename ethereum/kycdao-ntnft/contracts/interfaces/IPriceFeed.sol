// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title A standard interface for asking for prices from an Oracle
 */
interface IPriceFeed {

    /// @dev Get the latest price for this price feed
    /// @return price The last price
    /// @return decimals The number of decimals in the price
    function lastPrice() external view returns (uint price, uint8 decimals);
}