// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "./interfaces/IKycdaoNTNFT.sol";
import "./interfaces/IPriceFeed.sol";

/// @title KycdaoNTNFT
/// @dev Non-transferable NFT for KycDAO
///
contract KycdaoNTNFT is ERC721EnumerableUpgradeable, AccessControlUpgradeable, BaseRelayRecipient, UUPSUpgradeable, IKycdaoNTNFT {
    using ECDSA for bytes32; /*ECDSA for signature recovery for license mints*/
    using Strings for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    string public metadataBaseURI; /* String to prepend to metadata CIDs */
    string public verificationDataBaseURI; /* [UNUSED] String to prepend to verification data paths */

    // Temporary storage for token data after authorization, but before minting (indexed by digest)
    mapping(bytes32 => string) private authorizedMetadataCIDs; /* Track if token minting is authorized, temporary storage for metadata CIDs */
    //TODO: Verification paths are unused
    mapping(bytes32 => string) private authorizedVerificationPaths; /* [UNUSED] Temporary storage for verification paths */

    // Final storage for token data after minting (indexed by token ID)
    mapping(uint256 => string) private tokenMetadataCIDs; /* Metadata CIDs per token */
    //TODO: Verification paths are unused
    mapping(uint256 => string) private tokenVerificationPaths; /* [UNUSED] Verification paths per token */

    uint public sendGasOnAuthorization;

    /// @notice Version of GSN used
    string public override constant versionRecipient = "2.2.6";

    /*****************
    START Version 0.2 VARIABLE DECLARATION
    *****************/

    struct Status {
        bool verified;
        uint expiry;
    }
    mapping(bytes32 => Status) private authorizedStatuses;
    mapping(uint256 => Status) private tokenStatuses;

    /*****************
    START Version 0.3 VARIABLE DECLARATION
    *****************/

    uint public constant WEI_TO_NATIVE_DECIMALS = 18;

    /// @notice The cost required for per year of subscription, expressed in USD
    /// but with SUBSCRIPTION_COST_DECIMALS zeroes to allow for smaller values
    uint public subscriptionCostPerYear;
    uint public constant SUBSCRIPTION_COST_DECIMALS = 8;

    IPriceFeed public nativeUSDPriceFeed;
    mapping(bytes32 => bool) private authorizedSkipPayments; /* [UNUSED] Whether to skip mint payments */      

    /*****************
    START Version 0.4 VARIABLE DECLARATION
    *****************/

    uint public constant SECS_IN_YEAR = 365 * 24 * 60 * 60;
    mapping(bytes32 => uint32) private authorizedSecondsToPay; /* How many seconds need to be paid for on mint */    

    mapping(bytes32 => string) private authorizedTiers;
    mapping(uint256 => string) private tokenTiers;

    /*****************
    START Version 0.4.1 VARIABLE DECLARATION
    *****************/

    string public storageVersion;   // Used to represent the version of the stored variables. Used for migration purposes.
    string public constant DEFAULT_TIER = "KYC_1";  // Default tier for all mints in an older version

    event StorageVersionUpdated(string newVersion);

    /*****************
    START Version 0.4.3 VARIABLE DECLARATION
    *****************/

    address payable public safeAddress;

    /*****************
    NOTICE: To ensure upgradeability, all NEW variables must be declared below.
    To keep track, ensure to add a version tracker to the start of the new variables declared
    *****************/

    /// @dev Current version of this smart contract
    function version() public pure returns (string memory) {
        return "0.4.3";
    }

    /// @dev This implementation contract shouldn't be initialized directly
    /// but rather through the proxy, thus we disable it here.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev This initialize is called by our ProxyUUPS which calls
    /// this initialize whilst initializing itself
    function initialize(
        string memory name_,
        string memory symbol_,
        string memory metadataBaseURI_,
        address nativeUSDPriceFeedAddr
    )  public onlyInitializing {
        _initialize(name_, symbol_, metadataBaseURI_, nativeUSDPriceFeedAddr);
    }

    /// @dev initialize sets the contract metadata and the roles
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param metadataBaseURI_ Base URI for metadata CIDs
    function _initialize(
        string memory name_,
        string memory symbol_,
        string memory metadataBaseURI_,
        address nativeUSDPriceFeedAddr
    )  internal onlyInitializing {
        __ERC721_init(name_, symbol_);
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(OWNER_ROLE, _msgSender());
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());        
        _setBaseURI(metadataBaseURI_);

        sendGasOnAuthorization = 0;
        subscriptionCostPerYear = 5 * 10 ** SUBSCRIPTION_COST_DECIMALS;
        nativeUSDPriceFeed = IPriceFeed(nativeUSDPriceFeedAddr);
    }

    /*****************
    Authorized Minting
    *****************/

    function mintWithSignature(
        uint32 /*_auth_code*/, 
        string memory /*_metadata_cid*/, 
        uint /*_expiry*/,
        uint32 /*_seconds_to_pay*/, 
        string calldata /*_verification_tier*/, 
        bytes calldata /*_signature*/) 
        external 
        payable 
        override
    {
        revert("Not yet implemented");        
    }

    /// @dev Mint the token by using an authorization code from an authorized account
    function mintWithCode(uint32 _auth_code) 
        external 
        payable
        override 
    {
        address _dst = _msgSender();
        bytes32 _digest = _getDigest(_auth_code, _dst);

        // get and remove authorized metadata CID
        string memory _metadata_cid = authorizedMetadataCIDs[_digest];
        require(bytes(_metadata_cid).length != 0, "Unauthorized code");

        // check for payment or whether it should be skipped
        uint32 _secondsToPay = authorizedSecondsToPay[_digest];
        uint cost = getRequiredMintCostForSeconds(_secondsToPay);
        if (cost > 0) {
            // We can't support native payments in GSN, so we revert to prevent people trying
            require(msg.sender == _msgSender(), "Native payments via GSN not supported");
            require(msg.value >= cost, "Insufficient payment for minting");
        }

        // checks passed, continue with minting below

        // check if we need to migrate auth maps for this mint
        // we can see if we need to migrate by checking if the status is NOT verified (was revoked)
        if (!authorizedStatuses[_digest].verified) {
            // migrate to new auth maps
            _migrateAuthMaps(_digest);
        }        
        string memory _tier = authorizedTiers[_digest];
        Status memory _status = authorizedStatuses[_digest];

        delete authorizedMetadataCIDs[_digest];
        delete authorizedStatuses[_digest];
        delete authorizedSecondsToPay[_digest];
        delete authorizedTiers[_digest];

        // Store token metadata CID
        // Actual tokenId will be current + 1
        uint256 _id = _tokenIds.current() + 1;
        tokenMetadataCIDs[_id] = _metadata_cid;
        tokenStatuses[_id] = _status;
        tokenTiers[_id] = _tier;

        // Mint token
        _mintInternal(_dst);

        // Refund any excess payment
        if (cost > 0) {
            uint refund = msg.value - cost;
            if (refund > 0) {
                (bool success, ) = _dst.call{value: refund}("");
                require(success, "Refund failed");
            }
        }
    }

    function authorizeMintWithCode(uint32 _auth_code, address _dst, string calldata _metadata_cid, uint _expiry, uint32 _seconds_to_pay, string calldata _verification_tier)
        external
        override
        onlyMinter
    {
        bytes32 _digest = _getDigest(_auth_code, _dst);
        require(bytes(authorizedMetadataCIDs[_digest]).length == 0, "Code already authorized");
        authorizedMetadataCIDs[_digest] = _metadata_cid;
        authorizedStatuses[_digest] = Status (true, _expiry);
        authorizedTiers[_digest] = _verification_tier;
        authorizedSecondsToPay[_digest] = _seconds_to_pay;

        if (sendGasOnAuthorization > 0) {
            (bool sent, ) = _dst.call{value: sendGasOnAuthorization}("");
            require(sent, "Failed to send gas for minting");
        }        
    }

    /*****************
    Public interfaces
    *****************/

    function tokenURI(uint256 _tokenId)
        public
        view
        override
        tokenExists(_tokenId)
        returns (string memory)
    {
        string memory uri = _baseURI();
        string memory metadata_cid = tokenMetadataCIDs[_tokenId];
        return
            bytes(uri).length > 0
                ? string(abi.encodePacked(uri, metadata_cid))
                : "";
    }

    /// @dev Get the current expiry of a specific token in secs since epoch
    /// @param _tokenId ID of the token to query
    /// @return expiry The expiry of the given token in secs since epoch
    function tokenExpiry(uint256 _tokenId)
        public
        view
        override
        tokenExists(_tokenId)
        returns (uint)
    {
        return tokenStatuses[_tokenId].expiry;
    }

    /// @dev Get the verification tier of a specific token
    /// @param _tokenId ID of the token to query
    /// @return tier The tier of the given token in secs since epoch
    function tokenTier(uint256 _tokenId)
        public
        view
        override
        tokenExists(_tokenId)
        returns (string memory)
    {
        return tokenTiers[_tokenId];
    }

    function hasValidToken(address _addr)
        public
        view
        override
        returns (bool)
    {
        uint numTokens = balanceOf(_addr);
        for (uint i=0; i<numTokens; i++) {
            uint tokenId = tokenOfOwnerByIndex(_addr, i);
            if (tokenStatuses[tokenId].expiry > block.timestamp
                && tokenStatuses[tokenId].verified) {
                    return true;
                }
        }

        return false;
    }

    /// @dev Returns the amount in NATIVE (wei) which is expected for a given mint which uses an auth code
    /// @param _auth_code The auth code used to authorize the mint
    /// @param _dst Address to mint the token to
    function getRequiredMintCostForCode(uint32 _auth_code, address _dst)
        public
        view
        override
        returns (uint)
    {
        bytes32 _digest = _getDigest(_auth_code, _dst);
        string memory _metadata_cid = authorizedMetadataCIDs[_digest];
        require(bytes(_metadata_cid).length != 0, "Unauthorized code");
        return getRequiredMintCostForSeconds(authorizedSecondsToPay[_digest]);
    }

    /// @dev Returns the amount in NATIVE (wei) which is expected for a given amount of subscription time in seconds
    /// @param _seconds The number of seconds of subscription time to calculate the cost for
    function getRequiredMintCostForSeconds(uint32 _seconds)
        public
        view
        override
        returns (uint)
    {
        return (getSubscriptionPricePerYearNative() * _seconds) / SECS_IN_YEAR;
    }

    /**
     * @notice Returns the amount in NATIVE (wei) which is expected
     * when minting per year of subscription
     */
    function getSubscriptionPricePerYearNative() 
        internal 
        view 
        returns (uint) {
        (
            uint price,
            uint8 decimals
        ) = nativeUSDPriceFeed.lastPrice();
        uint decimalConvert = 10 ** (WEI_TO_NATIVE_DECIMALS - SUBSCRIPTION_COST_DECIMALS + decimals);
        return (subscriptionCostPerYear * decimalConvert) / price;
    }

    /// @dev Returns the cost for subscription per year in USD, to SUBSCRIPTION_COST_DECIMALS decimal places
    function getSubscriptionCostPerYearUSD() 
        external 
        view 
        override
        returns (uint) {
        return subscriptionCostPerYear;
    }

    ///@dev Support interfaces for Access Control and ERC721
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC721EnumerableUpgradeable).interfaceId ||
            interfaceId == type(IERC721MetadataUpgradeable).interfaceId ||
            interfaceId == type(IAccessControlUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /*****************
    Payment
    *****************/

    ///@dev fallback function to accept any payment
    receive() external payable {
    }

    ///@dev for retrieving all payments sent to contract
    function sendBalanceToSafe() public {
        require(safeAddress != address(0), "Safe address is not initialized!");
        safeAddress.transfer(address(this).balance);
    }

    /*****************
    Config
    *****************/
    /// @notice Set new base URI for token metadata CIDs
    /// @param baseURI_ String to prepend to token metadata CIDs
    function setMetadataBaseURI(string memory baseURI_) external onlyOwner {
        _setBaseURI(baseURI_);
    }

    /// @notice Set the amount of gas to be sent after mint authorization
    /// @param value_ uint WEI to send
    function setSendGasOnAuthorization(uint value_) external onlyOwner {
        sendGasOnAuthorization = value_;
    }

    /// @notice Set the subscriptionCostPerYear in USD
    /// @param value_ uint new mintCost in USD
    function setSubscriptionCost(uint value_) external onlyOwner {
        subscriptionCostPerYear = value_;
    }

    /// @notice Set the price feed used for native - USD conversions
    /// @param address_ address the address of the price feed
    function setPriceFeed(address address_) external onlyOwner {
        nativeUSDPriceFeed = IPriceFeed(address_);
    }

    /// @notice Set the address of the multisig safe to send balance to
    /// @param address_ address the address of the safe
    function setSafeAddress(address payable address_) external onlyOwner {
        safeAddress = address_;
    }

    /*****************
    Token Status Updates
    *****************/

    /// @dev Set whether a token is verified or not
    /// @param _tokenId ID of the token
    /// @param _verified A bool indicating whether this token is verified
    function setVerifiedToken(uint _tokenId, bool _verified) external override onlyMinter tokenExists(_tokenId) {
        tokenStatuses[_tokenId].verified = _verified;
    }

    /// @dev Update the given token to a new expiry
    /// @param _tokenId ID of the token whose expiry should be updated
    /// @param _expiry New expiry date for the token in secs since epoch
    function updateExpiry(uint _tokenId, uint _expiry) external override onlyMinter tokenExists(_tokenId) {
        tokenStatuses[_tokenId].expiry = _expiry;
    }

    /*****************
    GSN
    *****************/
    /// @notice Returns actual message sender when transaction is proxied via relay in GSN
    function _msgSender() override(ContextUpgradeable, BaseRelayRecipient) internal virtual view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    /// @notice Returns actual message data when transaction is proxied via relay in GSN
    function _msgData() override(ContextUpgradeable, BaseRelayRecipient) internal virtual view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    /// @notice Tells the contract which forwarder on this network to trust
    /// @param _forwarder the address of the forwarder
    function setTrustedForwarder(address _forwarder) external onlyOwner {
        _setTrustedForwarder(_forwarder);
    } 

    /*****************
    PROXY
    *****************/

    function _authorizeUpgrade(address) override internal onlyOwner {
    }

    /*****************
    HELPERS
    *****************/

    modifier onlyOwner() {
        require(hasRole(OWNER_ROLE, _msgSender()), "!owner");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "!minter");
        _;
    }

    modifier tokenExists(uint _tokenId) {
        require(
            _exists(_tokenId),
            "!tokenExists");
        _;
    }

    function _getDigest(uint32 _auth_code, address _dst) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_auth_code, _dst, address(this)));
    }

    /// @notice internal helper to retrieve private base URI for token URI construction
    function _baseURI() internal view override returns (string memory) {
        return metadataBaseURI;
    }

    /// @notice internal helper to update token URI
    /// @param baseURI_ String to prepend to token IDs
    function _setBaseURI(string memory baseURI_) internal {
        metadataBaseURI = baseURI_;
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
    ) internal override(ERC721EnumerableUpgradeable) {
        require(from == address(0), "Not transferable!");
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /*****************
    MIGRATIONS
    *****************/

    /// @dev migrate storage from an older version of the contract to the current one
    function _migrate() public onlyOwner {
        if (keccak256(bytes(version())) == keccak256(bytes(storageVersion))) {
            return;
        // Versions < 0.4.1 had no storage version
        } else if (bytes(storageVersion).length == 0) {
            for(uint i = 1; i <= totalSupply(); i++) {
                tokenStatuses[i].verified = true;     // Set verified to true, as it was previously 'revoked'
                tokenTiers[i] = DEFAULT_TIER;         // Use default tier
            }
            storageVersion = version();
            emit StorageVersionUpdated(storageVersion);
        } else {
            revert("Unsupported version");
        }
    }

    /// @dev migrate auth maps from an older version of the contract to the current one
    function _migrateAuthMaps(bytes32 _digest) internal {
        authorizedStatuses[_digest].verified = true;
        authorizedTiers[_digest] = DEFAULT_TIER;
        // Delete refs to old maps
        delete authorizedVerificationPaths[_digest];
        delete authorizedSkipPayments[_digest];
    }
}
