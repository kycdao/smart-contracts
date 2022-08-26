# kycDAO EVM Smart Contracts
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

NOTE: This CHANGELOG tracks changes to both contracts covered by kycDAO: **kycDAONTNFT** and **kycDAONTNFTAccreditation**

## [Unreleased]

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
