// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../interfaces/IStdReference.sol";

/// @title TestBandPriceFeed
/// @dev Used for testing price feeds on networks where they are not deployed (localnet)
contract TestBandPriceFeed is IStdReference {

  uint256 public answer;

  constructor(uint256 _answer) {
    answer = _answer;
  }

  /// Returns the price data for the given base/quote pair. Revert if not available.
  function getReferenceData(string memory /*_base*/, string memory /*_quote*/)
      external
      view
      returns (ReferenceData memory) {
          return ReferenceData({
              rate: answer,
              lastUpdatedBase: 1,
              lastUpdatedQuote: 1
          });
      }

  /// Similar to getReferenceData, but with multiple base/quote pairs at once.
  function getReferenceDataBulk(string[] memory _bases, string[] memory _quotes)
      external
      view
      returns (ReferenceData[] memory) { 
        // unused
      }

}