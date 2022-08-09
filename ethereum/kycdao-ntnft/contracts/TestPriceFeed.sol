// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/// @title TestPriceFeed
/// @dev Used for testing price feeds on networks where they are not deployed (localnet)
contract TestPriceFeed is AggregatorV3Interface {
  function decimals() external pure returns (uint8) {
    return 8;
  }

  function description() external pure returns (string memory) {
    return "Test price feed";
  }

  function version() external pure returns (uint256) {
    return 1;
  }

  //We currently on care about answer so we can reply with dummy
  //values for everything else
  function getRoundData(uint80)
    external
    pure
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return (
            1,
            100000000,
            1,
            1,
            1
        );
    }

  //We currently on care about answer so we can reply with dummy
  //values for everything else
  function latestRoundData()
    external
    pure
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return (
            1,
            100000000,
            1,
            1,
            1
        );
    }
}