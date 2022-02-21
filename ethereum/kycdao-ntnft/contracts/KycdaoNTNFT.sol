// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "hardhat/console.sol";

/// @title KycdaoNTNFT
/// @dev Non-transferable NFT for KycDAO
///
contract KycdaoNTNFT is ERC721Enumerable, AccessControl {
    using ECDSA for bytes32; /*ECDSA for signature recovery for license mints*/
    using Strings for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    string public baseURI; /*baseURI_ String to prepend to token IDs*/

    mapping(bytes32 => bool) public signatureUsed; /* track if authorization signature has been used */

    /// @dev Constructor sets the token metadata and the roles
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) ERC721(name_, symbol_) {
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(OWNER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        _setBaseURI(baseURI_);
    }

    /*****************
    Permissioned Minting
    *****************/
    /// @dev Mint the token for using a signature from an authorized minter
    function mint(uint256 _nonce, bytes memory _signature) external {
        address _dst = msg.sender;
        bytes32 _digest = keccak256(
            abi.encodePacked(_nonce, _dst, address(this))
        );
        require(!signatureUsed[_digest], "signature already used");
        signatureUsed[_digest] = true; /*Mark signature as used so we cannot use it again*/
        require(
            _verify(_digest, _signature, MINTER_ROLE),
            "invalid authorization"
        ); // verify auth was signed by owner of token ID 1
        _mintInternal(_dst);
    }

    /// @dev Mint the token by authorized minter contract or EOA
    function mintAdmin(address _dst) external {
        require(hasRole(MINTER_ROLE, msg.sender), "!minter");
        _mintInternal(_dst);
    }

    /*****************
    Public interfaces
    *****************/
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory uri = _baseURI();
        // TODO use metadata instead of tokenID
        return
            bytes(uri).length > 0
                ? string(abi.encodePacked(uri, tokenId.toString(), ".json"))
                : "";
    }

    ///@dev Support interfaces for Access Control and ERC721
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Enumerable).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /*****************
    Config
    *****************/
    /// @notice Set new base URI for token IDs
    /// @param baseURI_ String to prepend to token IDs
    function setBaseURI(string memory baseURI_) external {
        require(hasRole(OWNER_ROLE, msg.sender), "!owner");
        _setBaseURI(baseURI_);
    }

    /*****************
    INTERNAL MINTING FUNCTIONS AND HELPERS
    *****************/
    /// @notice internal helper to retrieve private base URI for token URI construction
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /// @notice internal helper to update token URI
    /// @param baseURI_ String to prepend to token IDs
    function _setBaseURI(string memory baseURI_) internal {
        baseURI = baseURI_;
    }

    /// @dev Internal util for minting
    function _mintInternal(address _dst) internal {
        _tokenIds.increment();

        uint256 _id = _tokenIds.current();

        _safeMint(_dst, _id);
    }

    /// @dev Internal util to confirm seed sig
    /// @param data Message hash
    /// @param signature Sig from primary token holder
    /// @param role Role recovered address should have
    function _verify(
        bytes32 data,
        bytes memory signature,
        bytes32 role
    ) internal view returns (bool) {
        return hasRole(role, data.toEthSignedMessageHash().recover(signature));
    }

    /// @dev Internal hook to disable all transfers
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Enumerable) {
        require(from == address(0), "Not transferable!");
    }
}
