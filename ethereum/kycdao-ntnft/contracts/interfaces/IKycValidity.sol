// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title A standard interface for checking and updating the expiry and validity of KYC Non-transferable NFTs
 */
interface IKycValidity {

    /// @dev Check whether a given address has ANY token which is valid, 
    ///      i.e. is verified and has an expiry in the future
    /// @param _addr Address to check for tokens
    /// @return valid Whether the address has a valid token
    function hasValidToken(address _addr) external view returns (bool valid);

}