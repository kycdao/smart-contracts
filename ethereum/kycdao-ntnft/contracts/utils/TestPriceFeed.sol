// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/// @title TestPriceFeed
/// @dev Used for testing price feeds on networks where they are not deployed (localnet)
contract TestPriceFeed is AggregatorV3Interface {

  int256 public answer;

  constructor(int256 _answer) {
    answer = _answer;
  }

  function decimals() external pure returns (uint8) {
    return 8;
  }

  function description() external pure returns (string memory) {
    return "Test price feed";
  }

  function version() external pure returns (uint256) {
    return 1;
  }

  //We currently only care about answer so we can reply with dummy
  //values for everything else
  function getRoundData(uint80)
    external
    view
    returns (
      uint80 _roundId,
      int256 _answer,
      uint256 _startedAt,
      uint256 _updatedAt,
      uint80 _answeredInRound
    ) {
        return (
            1,
            answer,
            1,
            1,
            1
        );
    }

  //We currently only care about answer so we can reply with dummy
  //values for everything else
  function latestRoundData()
    external
    view
    returns (
      uint80 _roundId,
      int256 _answer,
      uint256 _startedAt,
      uint256 _updatedAt,
      uint80 _answeredInRound
    ) {
        return (
            1,
            answer,
            1,
            1,
            1
        );
    }
}