# kycDAO EVM Smart Contracts
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

NOTE: This CHANGELOG tracks changes to both contracts covered by kycDAO: **kycDAONTNFT** and **kycDAONTNFTAccreditation**

## [Unreleased]

## kycDAONTNFT [0.4.2] - 2023-03-07
### Added
- Added `safeAddress` variable to store multisig safe address, can be modified with the new `setSafeAddress` function
- Renamed `sendBalanceTo` to `sendBalanceToSafe`, made it callable by anyone

## kycDAONTNFT [0.4.1] - 2022-12-20
### Added
- Added a variable `storageVersion` which records the current version of the contract's stored variables, used when running `_migrate`
- Added a `_migrate` function which runs at the time of upgrading a contract, used to migrate stored variables from one version to another
- Added a `_migrateAuthMaps` function which runs at the time of minting, used to migrate stored authMints from older versions

## kycDAONTNFT [0.4.0] - 2022-12-02
### Added
- Major change to payment handling, with mint cost now being based on amount of subscription time in seconds
- Verification tiers are now part of the mint, however they are not used for now
- A utility function `getRequiredMintCostForCode` can be used to get the mint cost for an auth code
- Another utility function `getRequiredMintCostForSeconds` can be used to get the subscription price based on seconds
### Changed
- `authorizeMint` renamed to `authorizeMintWithCode` to differentiate it from upcoming mint with signature handling
- Similarly `mint` has been renamed to `mintWithCode`
- Due to change of payment based on subscription, `authorizeMintWithCode` now takes seconds required to be paid for on mint
- Most checks now done via modifiers
- `isRevoked` now renamed to `verified`, which means its meaning is now inverted
- Any `mintCost` reference is now a `subscriptionCost`
### Removed
- Any use of the verificationURI is now removed, from auth, mint and initialize
- Any use of the skipPayment maps is now removed, from auth and mint

## kycDAONTNFT [0.3.2] - 2022-11-15
### Removed
- Removed 'initializeStd' function
### Changed
- Some minor refactors to return variables

## kycDAONTNFTAccreditation [0.3.2] - 2022-11-15
### Removed
- Removed 'initializeStd' function
### Changed
- Some minor refactors to return variables

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

