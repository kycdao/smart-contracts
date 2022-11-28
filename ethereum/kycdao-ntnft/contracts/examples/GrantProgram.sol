// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "../interfaces/IKycValidity.sol";

/// @title An example contract which uses the IKycValidity interface
///
contract GrantProgram {
    IKycValidity public kycValidity;

    constructor(address _kycValidity) {
        kycValidity = IKycValidity(_kycValidity);
    }

    function acceptNewGrant() public hasKYC() {
        // proceed with accepting new grant application from msg.sender
    }

    modifier hasKYC() {
        require(kycValidity.hasValidToken(msg.sender), "You must have a valid KYC token to use this contract");
        _;
    }
} 