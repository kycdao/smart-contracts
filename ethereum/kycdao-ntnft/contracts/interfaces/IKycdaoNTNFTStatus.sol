// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title A standard interface for checking and updating the expiry and validity of KYC Non-transferable NFTs
 */
interface IKycdaoNTNFTStatus {

    /// @dev Get the current expiry of a specific token in secs since epoch
    /// @param _tokenId ID of the token to query
    /// @return expiry The expiry of the given token in secs since epoch
    function tokenExpiry(uint256 _tokenId) external view returns (uint expiry);

    /// @dev Whether the given token has been revoked
    /// @param _tokenId ID of the token to query
    /// @return isRevoked Whether the given token has been revoked
    function tokenIsRevoked(uint256 _tokenId) external view returns (bool isRevoked);

    /// @dev Check whether a given address has ANY token which is valid, 
    ///      i.e. is NOT revoked and has an expiry in the future
    /// @param _addr Address to check for tokens
    /// @return valid Whether the address has a valid token
    function hasValidToken(address _addr) external view returns (bool valid);

    /// @dev Set whether a token is revoked or not
    /// @param _tokenId ID of the token to revoke
    /// @param _revoked A bool indicating whether this token is revoked
    function setRevokeToken(uint _tokenId, bool _revoked) external;

    /// @dev Update the given token to a new expiry
    /// @param _tokenId ID of the token whose expiry should be updated
    /// @param _expiry New expiry date for the token in secs since epoch
    function updateExpiry(uint _tokenId, uint _expiry) external;
}