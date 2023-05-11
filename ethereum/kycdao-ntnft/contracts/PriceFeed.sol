// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IPriceFeed.sol";
import "./interfaces/IStdReference.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title A standard interface for asking for prices from an Oracle
 */
contract PriceFeed is Ownable, IPriceFeed {
    
    enum PriceFeedType { CHAINLINK, BAND, PYTH }

    address public priceFeedAddress;

    PriceFeedType public priceFeedType;
    string public bandBase;
    string public bandQuote;

    bytes32 public pythProduct;

    constructor(address _priceFeedAddress, PriceFeedType _priceFeedType, string memory _bandBase, string memory _bandQuote, bytes32 _pythProduct) {
        require(_priceFeedType == PriceFeedType.CHAINLINK || 
                _priceFeedType == PriceFeedType.BAND || 
                _priceFeedType == PriceFeedType.PYTH, "Invalid price feed type");
        priceFeedType = _priceFeedType;
        priceFeedAddress = _priceFeedAddress;
        bandBase = _bandBase;
        bandQuote = _bandQuote;
        pythProduct = _pythProduct;
    }

    /// @dev Get the latest price for this price feed
    /// @return price The last price
    /// @return decimals The number of decimals in the price
    function lastPrice() external view returns (uint price, uint8 decimals) {
        if (priceFeedType == PriceFeedType.CHAINLINK) {
            AggregatorV3Interface chainlinkPriceFeed = AggregatorV3Interface(priceFeedAddress);
            (, int256 aggPrice, , , ) = chainlinkPriceFeed.latestRoundData();
            price = uint(aggPrice);
            decimals = chainlinkPriceFeed.decimals();
        } else if (priceFeedType == PriceFeedType.BAND) {
            IStdReference bandPriceFeed = IStdReference(priceFeedAddress);
            price = bandPriceFeed.getReferenceData(bandBase, bandQuote).rate;
            decimals = 18;
        } else if (priceFeedType == PriceFeedType.PYTH) {
            IPyth pythPriceFeed = IPyth(priceFeedAddress);
            // unsafe just skips the check for the price being too old
            PythStructs.Price memory pythPrice = pythPriceFeed.getPriceUnsafe(pythProduct);
            uint32 priceDecimals = uint32(18 - pythPrice.expo);
            price = (10 ** priceDecimals) / uint(uint64(pythPrice.price));
            decimals = 18;
        } else {
            revert("Invalid price feed type");
        }
    }

    function setPriceFeedChainlink(address _priceFeedAddress) public onlyOwner {
        priceFeedType = PriceFeedType.CHAINLINK;
        priceFeedAddress = _priceFeedAddress;
    }

    function setPriceFeedBand(address _priceFeedAddress, string calldata _bandBase, string calldata _bandQuote) public onlyOwner {
        priceFeedType = PriceFeedType.BAND;
        priceFeedAddress = _priceFeedAddress;
        bandBase = _bandBase;
        bandQuote = _bandQuote;
    }

    function setPriceFeedPyth(address _priceFeedAddress, bytes32 _pythProduct) public onlyOwner {
        priceFeedType = PriceFeedType.PYTH;
        priceFeedAddress = _priceFeedAddress;
        pythProduct = _pythProduct;
    }    
}