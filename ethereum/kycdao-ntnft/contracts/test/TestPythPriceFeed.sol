// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/// @title TestPythPriceFeed
/// @dev Used for testing price feeds on networks where they are not deployed (localnet)
contract TestPythPriceFeed is IPyth {

  int64 public answer;

  constructor(int64 _answer) {
    answer = _answer;
  }

    /// @notice Returns the price of a price feed without any sanity checks.
    /// @dev This function returns the most recent price update in this contract without any recency checks.
    /// This function is unsafe as the returned price update may be arbitrarily far in the past.
    ///
    /// Users of this function should check the `publishTime` in the price to ensure that the returned price is
    /// sufficiently recent for their application. If you are considering using this function, it may be
    /// safer / easier to use either `getPrice` or `getPriceNoOlderThan`.
    /// @return price - please read the documentation of PythStructs.Price to understand how to use this safely.
    function getPriceUnsafe(
        bytes32 /*id*/
    ) external view returns (PythStructs.Price memory price) {
        return PythStructs.Price({
            price: answer,
            conf: 0,
            publishTime: 0,
            expo: -8
        });
    }

    /// @notice Returns the price and confidence interval.
    /// @dev Reverts if the price has not been updated within the last `getValidTimePeriod()` seconds.
    /// @return price - please read the documentation of PythStructs.Price to understand how to use this safely.
    function getPrice(
        bytes32 /*id*/
    ) external view returns (PythStructs.Price memory price) {
        return PythStructs.Price({
            price: answer,
            conf: 0,
            publishTime: 0,
            expo: -8
        });
    }

    function getValidTimePeriod() external view returns (uint validTimePeriod) {}
    function getEmaPrice(
        bytes32 id
    ) external view returns (PythStructs.Price memory price) {}
    function getPriceNoOlderThan(
        bytes32 id,
        uint age
    ) external view returns (PythStructs.Price memory price) {}
    function getEmaPriceUnsafe(
        bytes32 id
    ) external view returns (PythStructs.Price memory price) {}
    function getEmaPriceNoOlderThan(
        bytes32 id,
        uint age
    ) external view returns (PythStructs.Price memory price) {}
    function updatePriceFeeds(bytes[] calldata updateData) external payable {}
    function updatePriceFeedsIfNecessary(
        bytes[] calldata updateData,
        bytes32[] calldata priceIds,
        uint64[] calldata publishTimes
    ) external payable {}
    function getUpdateFee(
        bytes[] calldata updateData
    ) external view returns (uint feeAmount) {}
    function parsePriceFeedUpdates(
        bytes[] calldata updateData,
        bytes32[] calldata priceIds,
        uint64 minPublishTime,
        uint64 maxPublishTime
    ) external payable returns (PythStructs.PriceFeed[] memory priceFeeds) {}

}