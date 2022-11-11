# kycDAO EVM Smart Contracts
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

NOTE: This CHANGELOG tracks changes to both contracts covered by kycDAO: **kycDAONTNFT** and **kycDAONTNFTAccreditation**

## [Unreleased]
### Removed
- Removed 'initializeStd' function from both contracts

## kycDAONTNFTAccreditation [0.3.1] - 2022-10-17
### Added
- Support for payments for minting via native payments (i.e. ETH or MATIC)
- `authorizeMint` now includes a parameter signifying whether payment is expected during `mint` (boolean)
- Ability to set the `mintCost` required, in USD. The conversion from USD to native is done via a ChainLink price feed
- `initialize` now expects a priceFeed address for the current USD to native price
- Added generic PriceFeed contract which implements (currently) both Chainlink and Band protocol type price feeds.
- kycDAONTNFT contract now uses any contract that implements the IPriceFeed interface for calculating mint costs, allowing us to add or change price feeds when needed without affecting the kycDAONTNFT contract.
- Our fork of the 'xdeployer' Hardhat plugin now includes support for deployment to CELO-like networks.
- Any amount sent over the required minting cost is now refunded to the sender's address on mint.

## kycDAONTNFT [0.3.1] - 2022-09-26
### Added
- Added generic PriceFeed contract which implements (currently) both Chainlink and Band protocol type price feeds.
- kycDAONTNFT contract now uses any contract that implements the IPriceFeed interface for calculating mint costs, allowing us to add or change price feeds when needed without affecting the kycDAONTNFT contract.
- Our fork of the 'xdeployer' Hardhat plugin now includes support for deployment to CELO-like networks.
### Changed
- Any amount sent over the required minting cost is now refunded to the sender's address on mint.

## kycDAONTNFT [0.3.0] - 2022-08-12
### Added
- Support for payments for minting via native payments (i.e. ETH or MATIC)
- `authorizeMint` now includes a parameter signifying whether payment is expected during `mint` (boolean)
- Ability to set the `mintCost` required, in USD. The conversion from USD to native is done via a ChainLink price feed
- `initialize` now expects a priceFeed address for the current USD to native price

## kycDAONTNFTAccreditation [0.2.0] - 2022-06-10
### Added
- First version of KYC contract for Accredited Investors, with equivalent functionality from standard KYC contract
- Implements same interface for `expiry` and `validity` via `IKycdaoNTNFTStatus`

## kycDAONTNFT [0.2.0] - 2022-06-10
### Added
- Support for setting `expiry` and `validity` of KYC NFTs via an interface called `IKycdaoNTNFTStatus`

## kycDAONTNFT [0.1.0] - 2022-03-01
### Added
- First version of KYC contract with support as an ERC721 (which is not transferable) and functions for minting

