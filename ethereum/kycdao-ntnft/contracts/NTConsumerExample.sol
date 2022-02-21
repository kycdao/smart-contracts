// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "hardhat/console.sol";

interface IERC721NT {
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

contract NTConsumerExample {
    using ECDSA for bytes32; /*ECDSA for signature recovery for license mints*/
    address signer;
    IERC721NT tokenContract;

    uint256 public genericState;

    constructor(address _signer, address _tokenContract) {
        signer = _signer;
        tokenContract = IERC721NT(_tokenContract);
    }

    modifier validOnly(
        uint256 _tokenId,
        uint256 _expiration,
        uint256 _tier,
        bytes memory _signature
    ) {
        require(validate(_tokenId, _expiration, _tier, _signature), "Invalid");
        _;
    }

    // GET kycdao.io/signatuers/tokenId

    function validate(
        uint256 _tokenId,
        uint256 _expiration,
        uint256 _tier,
        bytes memory _signature
    ) public view returns (bool) {
        require(_expiration > block.timestamp, "Expired");
        require(tokenContract.ownerOf(_tokenId) == msg.sender, "!owner"); /*Sender must hold token*/
        bytes32 _digest = keccak256(
            abi.encodePacked(
                address(tokenContract),
                _tokenId,
                _tier,
                _expiration
            )
        );
        require(_verify(_digest, _signature, signer), "Not signer");

        return true;
    }

    /// @dev Internal util to confirm seed sig
    /// @param data Message hash
    /// @param signature Sig from primary token holder
    /// @param account address to compare with recovery
    function _verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) internal pure returns (bool) {
        return data.toEthSignedMessageHash().recover(signature) == account;
    }

    function joinDao(
        uint256 _stateUpdate,
        uint256 _tokenId,
        uint256 _tier,
        uint256 _expiration,
        bytes memory _signature
    )
    public
    validOnly(_tokenId, _expiration, _tier, _signature)
    {
        genericState = _stateUpdate;
    }
}
