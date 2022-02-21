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

    string public baseURI; /*baseURI_ String to prepend to metadata URIs*/

    mapping(uint256 => string) private tokenMetadata;

    mapping(bytes32 => string) public authorizedMetadata; /* Track if token minting is authorized, store metadata */

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
    Authorized Minting
    *****************/
    /// @dev Mint the token by using a nonce from an authorized account
    function mint(uint128 _nonce) external {
        address _dst = msg.sender;
        bytes32 _digest = _getDigest(_nonce, _dst);

        // get and remove metadata
        string memory _metadata = authorizedMetadata[_digest];
        require(bytes(_metadata).length != 0, "unauthorized nonce");
        delete authorizedMetadata[_digest];

        // Mint token
        _mintInternal(_dst);

        // Store token metadata
        uint256 _id = _tokenIds.current();
        tokenMetadata[_id] = _metadata;
    }

    /// @dev Authorize the minting of a new token
    function authorizeMinting(uint128 _nonce, address _dst, string memory _metadata) external {
        require(hasRole(MINTER_ROLE, msg.sender), "!minter");
        bytes32 _digest = _getDigest(_nonce, _dst);

        string memory _old_metadata = authorizedMetadata[_digest];
        require(bytes(_old_metadata).length == 0, "Nonce already authorized");
        authorizedMetadata[_digest] = _metadata;
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
        string memory metadata = tokenMetadata[tokenId];
        return
            bytes(uri).length > 0
                ? string(abi.encodePacked(uri, metadata))
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
    HELPERS
    *****************/
    function _getDigest(uint128 _nonce, address _dst) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_nonce, _dst, address(this)));
    }

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

    /// @dev Internal hook to disable all transfers
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Enumerable) {
        require(from == address(0), "Not transferable!");
    }
}
