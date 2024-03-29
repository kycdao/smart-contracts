mod price_feed;

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LazyOption, UnorderedMap};
use near_sdk::*;
use near_sdk::env::{keccak256, block_timestamp};
use near_contract_standards::upgrade::Ownable;
use near_contract_standards::ntnft::{Token, NTNFT, TokenId};
use near_contract_standards::ntnft::metadata::*;

use serde::{Serialize, Deserialize};
use crate::price_feed::{PriceFeed, PriceFeedMocked};
use near_sdk::json_types::U128;
use std::str::FromStr;

type MintAuthorizationCode = u32;

pub const SUBSCRIPTION_COST_DECIMALS: u8 = 8;
const YOCTONEAR_TO_NATIVE_DECIMALS: u8 = 24;
const SECS_IN_YEAR: u128 = 365 * 24 * 60 * 60;
const DEFAULT_TIER: &str = "KYC_1";

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug)]
pub struct Status {
    /// shows if the token owner is verified
    pub verified: bool,
    /// expiry timestamp (epoch time in seconds)
    pub expiry: Option<u64>,
}

impl Status {
    pub fn is_valid(&self) -> bool {
        let expired = match self.expiry {
            Some(exp) => exp * u64::pow(10, 9) <= block_timestamp(),
            None => false,
        };
        !expired && self.verified
    }
}

impl Default for Status {
    fn default() -> Self {
        Status {
            verified: true,
            expiry: None,
        }
    }
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct OldKycdaoNTNFT {
    tokens: NTNFT,
    metadata: LazyOption<NTNFTContractMetadata>,
    next_token_id: u128,
    mint_authorizer: AccountId,
    /// Tracks if token minting is authorized, stores metadata temporarily
    authorized_token_metadata: LookupMap<Vec<u8>, TokenMetadata>,
    /// Stores status for authorized (but not yet minted) tokens temporarily
    authorized_statuses: UnorderedMap<Vec<u8>, Status>,
    /// Stores status for minted tokens
    token_statuses: UnorderedMap<TokenId, Status>,
    /// The cost required for per year of subscription, expressed in USD
    /// but with SUBSCRIPTION_COST_DECIMALS zeroes to allow for smaller values
    subscription_cost_per_year: u32,
    /// How many seconds need to be paid for on mint
    authorized_seconds_to_pay: UnorderedMap<Vec<u8>, u32>,
    /// Stores tier for authorized (but not yet minted) tokens
    authorized_tiers: UnorderedMap<Vec<u8>, String>,
    /// Stores tier for minted tokens
    token_tiers: UnorderedMap<TokenId, String>,
    /// Price feed for NEAR - USD conversions
    native_usd_price_feed: PriceFeed,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct KycdaoNTNFT {
    tokens: NTNFT,
    metadata: LazyOption<NTNFTContractMetadata>,
    next_token_id: u128,
    mint_authorizer: AccountId,
    /// Tracks if token minting is authorized, stores metadata temporarily
    authorized_token_metadata: LookupMap<Vec<u8>, TokenMetadata>,
    /// Stores status for authorized (but not yet minted) tokens temporarily
    authorized_statuses: UnorderedMap<Vec<u8>, Status>,
    /// Stores status for minted tokens
    token_statuses: UnorderedMap<TokenId, Status>,
    /// The cost required for per year of subscription, expressed in USD
    /// but with SUBSCRIPTION_COST_DECIMALS zeroes to allow for smaller values
    subscription_cost_per_year: u32,
    /// How many seconds need to be paid for on mint
    authorized_seconds_to_pay: UnorderedMap<Vec<u8>, u32>,
    /// Stores tier for authorized (but not yet minted) tokens
    authorized_tiers: UnorderedMap<Vec<u8>, String>,
    /// Stores tier for minted tokens
    token_tiers: UnorderedMap<TokenId, String>,
    /// Price feed for NEAR - USD conversions
    native_usd_price_feed: PriceFeedMocked,
}

const DATA_IMAGE_SVG_ICON: &str = "data:image/svg+xml,%3csvg width='307' height='402' viewBox='0 0 307 402' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cmask id='path-1-inside-1_1367_8934' fill='white'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M305.999 26.6087L279.391 0L152.999 126.391L119.738 93.1305L93.1296 119.739L152.999 179.609L305.999 26.6087ZM0.00195312 26.6093L66.5238 93.1311L93.1325 66.5224L26.6107 0.000546972L0.00195312 26.6093Z'/%3e%3c/mask%3e%3cpath d='M279.391 0L282.219 -2.82843L279.391 -5.65685L276.562 -2.82843L279.391 0ZM305.999 26.6087L308.828 29.4372L311.656 26.6087L308.828 23.7803L305.999 26.6087ZM152.999 126.391L150.171 129.22L152.999 132.048L155.828 129.22L152.999 126.391ZM119.738 93.1305L122.567 90.3021L119.738 87.4737L116.91 90.3021L119.738 93.1305ZM93.1296 119.739L90.3012 116.911L87.4728 119.739L90.3012 122.568L93.1296 119.739ZM152.999 179.609L150.171 182.437L152.999 185.266L155.828 182.437L152.999 179.609ZM66.5238 93.1311L63.6953 95.9595L66.5238 98.7879L69.3522 95.9595L66.5238 93.1311ZM0.00195312 26.6093L-2.82647 23.7808L-5.6549 26.6093L-2.82647 29.4377L0.00195312 26.6093ZM93.1325 66.5224L95.9609 69.3508L98.7893 66.5224L95.9609 63.6939L93.1325 66.5224ZM26.6107 0.000546972L29.4391 -2.82788L26.6107 -5.65631L23.7822 -2.82788L26.6107 0.000546972ZM276.562 2.82843L303.171 29.4372L308.828 23.7803L282.219 -2.82843L276.562 2.82843ZM155.828 129.22L282.219 2.82843L276.562 -2.82843L150.171 123.563L155.828 129.22ZM116.91 95.959L150.171 129.22L155.828 123.563L122.567 90.3021L116.91 95.959ZM95.9581 122.568L122.567 95.959L116.91 90.3021L90.3012 116.911L95.9581 122.568ZM155.828 176.78L95.9581 116.911L90.3012 122.568L150.171 182.437L155.828 176.78ZM303.171 23.7803L150.171 176.78L155.828 182.437L308.828 29.4372L303.171 23.7803ZM69.3522 90.3026L2.83038 23.7808L-2.82647 29.4377L63.6953 95.9595L69.3522 90.3026ZM90.304 63.6939L63.6953 90.3026L69.3522 95.9595L95.9609 69.3508L90.304 63.6939ZM23.7822 2.82897L90.304 69.3508L95.9609 63.6939L29.4391 -2.82788L23.7822 2.82897ZM2.83038 29.4377L29.4391 2.82897L23.7822 -2.82788L-2.82647 23.7808L2.83038 29.4377Z' fill='%233D65F2' mask='url(%23path-1-inside-1_1367_8934)'/%3e%3cmask id='path-3-inside-2_1367_8934' fill='white'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M305.999 248.298L279.391 221.69L152.999 348.081L119.738 314.82L93.1295 341.429L152.999 401.299L305.999 248.298ZM0.00195312 248.299L66.5238 314.821L93.1325 288.212L26.6107 221.69L0.00195312 248.299Z'/%3e%3c/mask%3e%3cpath d='M279.391 221.69L282.219 218.861L279.391 216.033L276.562 218.861L279.391 221.69ZM305.999 248.298L308.828 251.127L311.656 248.298L308.828 245.47L305.999 248.298ZM152.999 348.081L150.171 350.91L152.999 353.738L155.828 350.91L152.999 348.081ZM119.738 314.82L122.567 311.992L119.738 309.163L116.91 311.992L119.738 314.82ZM93.1295 341.429L90.3011 338.601L87.4727 341.429L90.3011 344.257L93.1295 341.429ZM152.999 401.299L150.171 404.127L152.999 406.955L155.828 404.127L152.999 401.299ZM66.5238 314.821L63.6953 317.649L66.5238 320.478L69.3522 317.649L66.5238 314.821ZM0.00195312 248.299L-2.82647 245.471L-5.6549 248.299L-2.82647 251.127L0.00195312 248.299ZM93.1325 288.212L95.9609 291.04L98.7893 288.212L95.9609 285.384L93.1325 288.212ZM26.6107 221.69L29.4391 218.862L26.6107 216.033L23.7822 218.862L26.6107 221.69ZM276.562 224.518L303.171 251.127L308.828 245.47L282.219 218.861L276.562 224.518ZM155.828 350.91L282.219 224.518L276.562 218.861L150.171 345.253L155.828 350.91ZM116.91 317.649L150.171 350.91L155.828 345.253L122.567 311.992L116.91 317.649ZM95.958 344.257L122.567 317.649L116.91 311.992L90.3011 338.601L95.958 344.257ZM155.828 398.47L95.958 338.601L90.3011 344.257L150.171 404.127L155.828 398.47ZM303.171 245.47L150.171 398.47L155.828 404.127L308.828 251.127L303.171 245.47ZM69.3522 311.992L2.83038 245.471L-2.82647 251.127L63.6953 317.649L69.3522 311.992ZM90.304 285.384L63.6953 311.992L69.3522 317.649L95.9609 291.04L90.304 285.384ZM23.7822 224.519L90.304 291.04L95.9609 285.384L29.4391 218.862L23.7822 224.519ZM2.83038 251.127L29.4391 224.519L23.7822 218.862L-2.82647 245.471L2.83038 251.127Z' fill='%233D65F2' mask='url(%23path-3-inside-2_1367_8934)'/%3e%3cmask id='path-5-inside-3_1367_8934' fill='white'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M-9.15527e-05 135.407L26.6086 108.798L153 235.19L186.261 201.929L212.87 228.538L153 288.407L-9.15527e-05 135.407ZM306.002 135.408L239.48 201.929L212.871 175.321L279.393 108.799L306.002 135.408Z'/%3e%3c/mask%3e%3cpath d='M26.6086 108.798L23.7802 105.97L26.6086 103.142L29.437 105.97L26.6086 108.798ZM-9.15527e-05 135.407L-2.82852 138.236L-5.65694 135.407L-2.82852 132.579L-9.15527e-05 135.407ZM153 235.19L155.828 238.018L153 240.847L150.172 238.018L153 235.19ZM186.261 201.929L183.433 199.101L186.261 196.272L189.089 199.101L186.261 201.929ZM212.87 228.538L215.698 225.709L218.527 228.538L215.698 231.366L212.87 228.538ZM153 288.407L155.828 291.236L153 294.064L150.172 291.236L153 288.407ZM239.48 201.929L242.309 204.758L239.48 207.586L236.652 204.758L239.48 201.929ZM306.002 135.408L308.83 132.579L311.659 135.408L308.83 138.236L306.002 135.408ZM212.871 175.321L210.043 178.149L207.215 175.321L210.043 172.492L212.871 175.321ZM279.393 108.799L276.565 105.971L279.393 103.142L282.222 105.971L279.393 108.799ZM29.437 111.627L2.82834 138.236L-2.82852 132.579L23.7802 105.97L29.437 111.627ZM150.172 238.018L23.7802 111.627L29.437 105.97L155.828 232.361L150.172 238.018ZM189.089 204.757L155.828 238.018L150.172 232.361L183.433 199.101L189.089 204.757ZM210.041 231.366L183.433 204.757L189.089 199.101L215.698 225.709L210.041 231.366ZM150.172 285.579L210.041 225.709L215.698 231.366L155.828 291.236L150.172 285.579ZM2.82834 132.579L155.828 285.579L150.172 291.236L-2.82852 138.236L2.82834 132.579ZM236.652 199.101L303.174 132.579L308.83 138.236L242.309 204.758L236.652 199.101ZM215.7 172.492L242.309 199.101L236.652 204.758L210.043 178.149L215.7 172.492ZM282.222 111.627L215.7 178.149L210.043 172.492L276.565 105.971L282.222 111.627ZM303.174 138.236L276.565 111.627L282.222 105.971L308.83 132.579L303.174 138.236Z' fill='%233D65F2' mask='url(%23path-5-inside-3_1367_8934)'/%3e%3c/svg%3e";

// NOTE: Add new keys to the end and do not delete any keys!
// because this is used as a C-like enum, so the index in the enum matters
// otherwise storage IDs will get mixed up and can cause deserialization issues
#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    AuthorizedTokenMetadata,
    #[allow(dead_code)]
    AuthorizedStatusesV0_3_2,
    #[allow(dead_code)]
    TokenStatusesV0_3_2,
    AuthorizedSecondsToPay,
    AuthorizedTiers,
    TokenTiers,
    AuthorizedStatuses,
    TokenStatuses,
}

#[near_bindgen]
impl KycdaoNTNFT {
    /// Initializes the contract with default metadata
    #[init]
    pub fn new_default_meta(base_uri: String) -> Self {
        Self::new(
            NTNFTContractMetadata {
                spec: NTNFT_METADATA_SPEC.to_string(),
                name: "KycDAO Identity".to_string(),
                symbol: "PEOPLE".to_string(),
                icon: Some(DATA_IMAGE_SVG_ICON.to_string()),
                base_uri: Some(base_uri),
                reference: None,
                reference_hash: None,
            },
        )
    }

    /// @dev Constructor sets the token metadata and the roles
    /// @param base_uri String to prepend to token IDs
    /// @param metadata Name, symbol, etc.
    #[init]
    pub fn new(metadata: NTNFTContractMetadata) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        metadata.assert_valid();

        let sender = env::signer_account_id();

        let price_feed_addr = AccountId::from_str("priceoracle.testnet").expect("accountID should be valid");
        let native_usd_price_feed = PriceFeedMocked::new(price_feed_addr);

        Self {
            tokens: NTNFT::new(
                StorageKey::NonFungibleToken,
                sender.to_owned(),
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            next_token_id: 0,
            mint_authorizer: sender.to_owned(),
            authorized_token_metadata: LookupMap::new(StorageKey::AuthorizedTokenMetadata),
            authorized_statuses: UnorderedMap::new(StorageKey::AuthorizedStatuses),
            token_statuses: UnorderedMap::new(StorageKey::TokenStatuses),
            subscription_cost_per_year: 5 * u32::pow(10, SUBSCRIPTION_COST_DECIMALS as u32),
            authorized_seconds_to_pay: UnorderedMap::new(StorageKey::AuthorizedSecondsToPay),
            authorized_tiers: UnorderedMap::new(StorageKey::AuthorizedTiers),
            token_tiers: UnorderedMap::new(StorageKey::TokenTiers),
            native_usd_price_feed,
        }
    }

    #[private]
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        log!("Starting migration to v0.4.1...");

        let old_state: OldKycdaoNTNFT = env::state_read().expect("failed");

        log!("Old state read successfully");

        let price_feed_addr = AccountId::from_str("priceoracle.testnet").expect("accountID should be valid");
        let native_usd_price_feed = PriceFeedMocked::new(price_feed_addr);

        log!("Defined price feed");

        Self {
            tokens: old_state.tokens,
            metadata: old_state.metadata,
            next_token_id: old_state.next_token_id,
            mint_authorizer: old_state.mint_authorizer,
            authorized_token_metadata: old_state.authorized_token_metadata,
            authorized_statuses: old_state.authorized_statuses,
            token_statuses: old_state.token_statuses,
            subscription_cost_per_year: old_state.subscription_cost_per_year,
            authorized_seconds_to_pay: old_state.authorized_seconds_to_pay,
            authorized_tiers: old_state.authorized_tiers,
            token_tiers: old_state.token_tiers,
            native_usd_price_feed,
        }
    }

    /*****************
    Authorized Minting
    *****************/
    /// @dev Mint the token by using a signature from an authorized account
    #[payable]
    pub fn mint_with_signature(
        &mut self,
       _auth_code: MintAuthorizationCode,
       _metadata: TokenMetadata,
       _expiry: Option<u64>,
       _seconds_to_pay: u32,
       _tier: String,
       _signature: Vec<u8>,
    ) -> Token {
        unimplemented!("Not yet implemented")
    }

    /// @dev Mint the token by using a code from an authorized account
    #[payable]
    pub fn mint_with_code(&mut self, auth_code: MintAuthorizationCode) -> Token {
        let dst = env::predecessor_account_id();
        //let dst = env::signer_account_id();

        let digest = KycdaoNTNFT::get_digest(auth_code, &dst);

        log!("Checking minting authorization for {} with code: {}", dst, auth_code);

        // Get prefilled metadata, also remove digest so it cannot be used again
        let metadata = self.authorized_token_metadata.remove(&digest).expect("Unauthorized code");
        let status = self.authorized_statuses.remove(&digest).unwrap_or_default();
        let tier = self.authorized_tiers.remove(&digest).unwrap_or(DEFAULT_TIER.to_string());
        let seconds_to_pay = self.authorized_seconds_to_pay.remove(&digest).unwrap_or(0);

        let cost = self.get_required_mint_cost_for_seconds_internal(seconds_to_pay);
        if cost > 0 {
            assert!(near_sdk::env::attached_deposit() >= cost, "Insufficient payment for minting");
        }

        let token_id = self.next_token_id;
        self.next_token_id = self.next_token_id.checked_add(1).expect("Token ID overflow");
        let token_id_str = token_id.to_string();

        let token = self.tokens.internal_mint(token_id_str.clone(), dst, Some(metadata), Some(cost));
        self.token_statuses.insert(&token_id_str, &status);
        self.token_tiers.insert(&token_id_str, &tier);

        token
    }

    /// @dev Authorize the minting of a new token
    pub fn authorize_mint_with_code(
        &mut self,
        auth_code: MintAuthorizationCode,
        dst: AccountId,
        metadata: TokenMetadata,
        expiry: Option<u64>,
        seconds_to_pay: u32,
        verification_tier: String,
    ) {
        self.assert_mint_authorizer();
        let digest = KycdaoNTNFT::get_digest(auth_code, &dst);

        log!("Authorizing minting for {} with code: {}", dst, auth_code);

        let authorized_opt = self.authorized_token_metadata.get(&digest);
        assert!(authorized_opt.is_none(), "Code already authorized");

        let new_status = Status {
            verified: true,
            expiry,
        };

        self.authorized_token_metadata.insert(&digest, &metadata);
        self.authorized_statuses.insert(&digest, &new_status);
        self.authorized_seconds_to_pay.insert(&digest, &seconds_to_pay);
        self.authorized_tiers.insert(&digest, &verification_tier);
    }

    /// @dev Returns the amount in NATIVE (yoctoNEAR) which is expected for a given mint which uses an auth code
    /// @param auth_code The auth code used to authorize the mint
    /// @param dst Address to mint the token to
    pub fn get_required_mint_cost_for_code(&self, auth_code: MintAuthorizationCode, dst: AccountId) -> U128 {
        let digest = KycdaoNTNFT::get_digest(auth_code, &dst);
        let authorized_opt = self.authorized_token_metadata.get(&digest);
        assert!(authorized_opt.is_some(), "Unauthorized code");
        let authorized_seconds_to_pay = self.authorized_seconds_to_pay.get(&digest).unwrap_or(0);
        self.get_required_mint_cost_for_seconds(authorized_seconds_to_pay)
    }

    /*****************
    Public interfaces
    *****************/
    pub fn version(&self) -> &str { "0.4.2" }

    pub fn token_uri(&self, token_id: TokenId) -> String {
        let token_metadata_store = self.tokens.token_metadata_by_id.as_ref().expect("Metadata not supported");
        let token_metadata: TokenMetadata = token_metadata_store.get(&token_id).expect("Token not found");

        let contract_metadata = self.metadata.get().expect("Metadata not supported");
        let base_uri = contract_metadata.base_uri.expect("Missing base_uri");
        assert!(!base_uri.is_empty(), "Empty base_uri");

        format!("{}/{}.json", base_uri, token_metadata.extra.expect("Missing token extra data"))
    }

    /// Check the validity of a specific token
    pub fn token_is_valid(&self, token_id: TokenId) -> bool {
        self.tokens.owner_by_id.get(&token_id).expect("Token not found");
        self.token_statuses.get(&token_id).unwrap_or_default().is_valid()
    }

    /// Check the expiry of the token (epoch time in seconds) - None means it never expires
    pub fn token_expiry(&self, token_id: TokenId) -> Option<u64> {
        self.tokens.owner_by_id.get(&token_id).expect("Token not found");
        self.token_statuses.get(&token_id).unwrap_or_default().expiry
    }

    /// Get the verification tier of a specific token
    pub fn token_tier(&self, token_id: TokenId) -> String {
        self.tokens.owner_by_id.get(&token_id).expect("Token not found");
        self.token_tiers.get(&token_id).unwrap_or(DEFAULT_TIER.to_string())
    }

    /// Check if an account has any valid tokens
    pub fn has_valid_token(&self, address: AccountId) -> bool {
        match self.tokens.tokens_per_owner.as_ref().expect("enumeration extension in use").get(&address) {
            Some(token_ids) => {
                for token_id in token_ids.iter() {
                    let status = self.token_statuses.get(&token_id).unwrap_or_default();
                    if status.is_valid() {
                        return true;
                    }
                }
                false
            }
            None => false,
        }
    }

    /// @dev Returns the amount in NATIVE (yoctoNEAR) which is expected for a given amount of subscription time in seconds
    /// @param seconds The number of seconds of subscription time to calculate the cost for
    pub fn get_required_mint_cost_for_seconds(&self, seconds: u32) -> U128 {
        U128(self.get_required_mint_cost_for_seconds_internal(seconds))
    }

    /// Returns the cost for subscription per year in USD, to SUBSCRIPTION_COST_DECIMALS decimal places
    pub fn get_subscription_cost_per_year_usd(&self) -> u32 {
        self.subscription_cost_per_year
    }

    pub fn get_mint_authorizer(&self) -> AccountId {
        self.mint_authorizer.clone()
    }

    /// @notice Get the price feed address used for native - USD conversions
    pub fn get_price_feed(&self) -> AccountId {
        self.native_usd_price_feed.price_feed_address()
    }

    /// @notice Get the last price on the price feed
    pub fn get_latest_price(&self) -> (u32, u8) {
        self.native_usd_price_feed.latest_price()
    }

    /*****************
    Mint authorizer functions
    *****************/
    /// Check if the token is verified or not (revoked)
    pub fn token_is_verified(&self, token_id: TokenId) -> bool {
        self.assert_mint_authorizer();
        self.tokens.owner_by_id.get(&token_id).expect("Token not found");
        self.token_statuses.get(&token_id).unwrap_or_default().verified
    }

    pub fn set_verified_token(&mut self, token_id: TokenId, verified: bool) {
        self.assert_mint_authorizer();
        self.tokens.owner_by_id.get(&token_id).expect("Token not found");
        let mut status = self.token_statuses.get(&token_id).unwrap_or_default();
        status.verified = verified;
        self.token_statuses.insert(&token_id, &status);
    }

    /// Update the expiry of a token - expects epoch time in seconds
    pub fn update_expiry(&mut self, token_id: TokenId, expiry: Option<u64>) {
        self.assert_mint_authorizer();
        self.tokens.owner_by_id.get(&token_id).expect("Token not found");
        let mut status = self.token_statuses.get(&token_id).unwrap_or_default();
        status.expiry = expiry;
        self.token_statuses.insert(&token_id, &status);
    }

    /*****************
    Owner functions
    *****************/
    /// @notice Set new base URI for references
    /// @param base_uri String to prepend references
    pub fn set_base_uri(&mut self, base_uri: String) {
        self.assert_owner();
        let mut metadata = self.metadata.get().expect("Metadata not supported");
        metadata.base_uri = Some(base_uri);
    }

    /// @notice Set the cost of subscription per yer
    /// @param value u32 the cost of subscription per year in USD
    pub fn set_subscription_cost(&mut self, value: u32) {
        self.assert_owner();
        self.subscription_cost_per_year = value;
    }

    pub fn set_mint_authorizer(&mut self, authorizer: AccountId) {
        self.assert_owner();
        self.mint_authorizer = authorizer;
    }

    /// for retrieving all payments sent to contract
    pub fn send_balance_to(&self, recipient: AccountId) {
        self.assert_owner();
        Promise::new(recipient).transfer(env::account_balance());
    }

    /// @notice Set the price feed address used for native - USD conversions
    /// @param address Address the address of the price feed
    pub fn set_price_feed(&mut self, address: AccountId) {
        self.assert_owner();
        self.native_usd_price_feed = PriceFeedMocked::new(address);
    }

    /// @notice Set the last price on the price feed
    /// @param price USD Price
    /// @parma decimals Number of decimals
    pub fn set_latest_price(&mut self, price: u32, decimals: u8) {
        self.assert_owner();
        self.native_usd_price_feed.set_latest_price(price, decimals)
    }

    /*****************
    HELPERS
    *****************/
    fn get_digest(auth_code: MintAuthorizationCode, dst: &AccountId) -> Vec<u8> {
        let contract_addr = env::current_account_id();
        keccak256(format!("{}{}{}", auth_code, dst, contract_addr).as_bytes())
    }

    fn assert_mint_authorizer(&self) {
        assert_eq!(env::predecessor_account_id(), self.get_mint_authorizer(), "Predecessor must be Mint Authorizer");
    }

    /// Returns the amount in NATIVE (yoctoNEAR) which is expected when minting per year of subscription
    fn get_subscription_price_per_year_native(&self) -> Balance {
        let (price, decimals) = self.native_usd_price_feed.latest_price();
        let decimal_convert = u128::pow(10, (YOCTONEAR_TO_NATIVE_DECIMALS - SUBSCRIPTION_COST_DECIMALS + decimals) as u32);
        return (self.subscription_cost_per_year as u128 * decimal_convert) / price as u128
    }

    pub fn get_required_mint_cost_for_seconds_internal(&self, seconds: u32) -> Balance {
        (self.get_subscription_price_per_year_native() * seconds as u128) / SECS_IN_YEAR
    }
}

near_contract_standards::impl_ntnft_core!(KycdaoNTNFT, tokens);
near_contract_standards::impl_ntnft_enumeration!(KycdaoNTNFT, tokens);

impl Ownable for KycdaoNTNFT {
    fn get_owner(&self) -> AccountId {
        self.tokens.owner_id.clone()
    }

    fn set_owner(&mut self, owner: AccountId) {
        self.assert_owner();
        self.tokens.owner_id = owner;
    }
}

#[near_bindgen]
impl NTNFTMetadataProvider for KycdaoNTNFT {
    fn ntnft_metadata(&self) -> NTNFTContractMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{testing_env};
    use near_sdk::test_utils::{accounts, VMContextBuilder};

    const MINT_STORAGE_COST: u128 = 6080000000000000000000;
    //const MINT_COST: u128 = near_sdk::ONE_NEAR;
    const MINT_COST: u128 = 0;

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(accounts(0))
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    fn sample_token_metadata(extra: String) -> TokenMetadata {
        TokenMetadata {
            title: Some("Olympus Mons".into()),
            description: Some("The tallest mountain in the charted solar system".into()),
            media: None,
            media_hash: None,
            copies: Some(1u64),
            issued_at: None,
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: Some(extra),
            reference: None,
            reference_hash: None,
        }
    }

    // TODO fix this - contract state is not deleted between tests
    #[test]
    #[ignore]
    fn test_new() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let contract = KycdaoNTNFT::new_default_meta("base2".to_string());
        testing_env!(context.is_view(true).build());
        assert_eq!(contract.ntnft_token("1".to_string()), None);
    }

    #[test]
    #[should_panic(expected = "The contract is not initialized")]
    fn test_default() {
        let context = get_context(accounts(1));
        testing_env!(context.build());
        let _contract = KycdaoNTNFT::default();
    }

    #[test]
    fn test_metadata() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let contract = KycdaoNTNFT::new_default_meta("base".to_string());
        testing_env!(context.is_view(true).build());
        assert_eq!(contract.ntnft_metadata().base_uri, Some("base".to_string()));
    }

    #[test]
    fn test_authorized_minting() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let mut contract = KycdaoNTNFT::new_default_meta("base".to_string());

        contract.authorize_mint_with_code(123, accounts(2), sample_token_metadata("somehash".to_string()), None, 0, DEFAULT_TIER.to_string());
        contract.authorize_mint_with_code(365, accounts(2), sample_token_metadata("othersomehash".to_string()), None, 0, DEFAULT_TIER.to_string());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(2))
            .predecessor_account_id(accounts(2))
            .build());

        let token = contract.mint_with_code(365);
        assert_eq!(token.token_id, "0".to_string());
        assert_eq!(token.owner_id, accounts(2));
        assert_eq!(token.metadata.unwrap(), sample_token_metadata("othersomehash".to_string()));

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(2))
            .predecessor_account_id(accounts(2))
            .build());

        let token = contract.mint_with_code(123);
        assert_eq!(token.token_id, "1".to_string());
        assert_eq!(token.owner_id, accounts(2));
        assert_eq!(token.metadata.unwrap(), sample_token_metadata("somehash".to_string()));
    }

    #[test]
    #[should_panic(expected = "Unauthorized code")]
    fn test_unauthorized_minting() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let mut contract = KycdaoNTNFT::new_default_meta("base".to_string());

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(2))
            .predecessor_account_id(accounts(2))
            .build());

        contract.mint_with_code(123);
    }

    // TODO fix this - contract state is not deleted between tests
    #[test]
    #[ignore]
    fn test_status_modifications() {
        let mut context = get_context(accounts(3));
        testing_env!(context.build());
        let mut contract = KycdaoNTNFT::new_default_meta("base3".to_string());

        // use default status fallback
        contract.authorize_mint_with_code(489, accounts(3), sample_token_metadata("somehash".to_string()), None, 0, DEFAULT_TIER.to_string());

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(3))
            .predecessor_account_id(accounts(3))
            .build());

        let token = contract.mint_with_code(489);

        assert_eq!(contract.token_expiry(token.token_id.clone()), None);
        assert_eq!(contract.token_statuses.get(&token.token_id).unwrap().verified, true);
        assert_eq!(contract.token_is_valid(token.token_id.clone()), true);
        assert_eq!(contract.has_valid_token(accounts(3)), true);

        contract.update_expiry(token.token_id.clone(), Some(1000));

        assert_eq!(contract.token_expiry(token.token_id.clone()), Some(1000));
        assert_eq!(contract.token_statuses.get(&token.token_id).unwrap().verified, true);
        assert_eq!(contract.token_is_valid(token.token_id.clone()), false);
        assert_eq!(contract.has_valid_token(accounts(3)), false);

        contract.update_expiry(token.token_id.clone(), Some(9000000000));

        assert_eq!(contract.token_expiry(token.token_id.clone()), Some(9000000000));
        assert_eq!(contract.token_statuses.get(&token.token_id).unwrap().verified, true);
        assert_eq!(contract.token_is_valid(token.token_id.clone()), true);
        assert_eq!(contract.has_valid_token(accounts(3)), true);

        contract.set_verified_token(token.token_id.clone(), false);

        assert_eq!(contract.token_expiry(token.token_id.clone()), Some(9000000000));
        assert_eq!(contract.token_statuses.get(&token.token_id).unwrap().verified, false);
        assert_eq!(contract.token_is_valid(token.token_id.clone()), false);
        assert_eq!(contract.has_valid_token(accounts(3)), false);

        contract.authorize_mint_with_code(789, accounts(3), sample_token_metadata("other".to_string()), None, 0, DEFAULT_TIER.to_string());

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(3))
            .predecessor_account_id(accounts(3))
            .build());

        let token_new = contract.mint_with_code(789);

        assert_eq!(contract.token_is_valid(token.token_id.clone()), false);
        assert_eq!(contract.token_is_valid(token_new.token_id.clone()), true);

        // default is valid
        assert_eq!(contract.has_valid_token(accounts(3)), true);
    }

    #[test]
    #[should_panic(expected = "Predecessor must be Mint Authorizer")]
    fn test_unauthorized_expiry_change() {
        let mut context = get_context(accounts(3));
        testing_env!(context.build());
        let mut contract = KycdaoNTNFT::new_default_meta("base3".to_string());

        // use default status fallback
        contract.authorize_mint_with_code(489, accounts(3), sample_token_metadata("somehash".to_string()), None, 0, DEFAULT_TIER.to_string());

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(3))
            .predecessor_account_id(accounts(3))
            .build());

        let token = contract.mint_with_code(489);

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(4))
            .predecessor_account_id(accounts(4))
            .build());

        contract.update_expiry(token.token_id.clone(), Some(1000));
    }

    #[test]
    #[should_panic(expected = "Predecessor must be Mint Authorizer")]
    fn test_unauthorized_revoke() {
        let mut context = get_context(accounts(3));
        testing_env!(context.build());
        let mut contract = KycdaoNTNFT::new_default_meta("base3".to_string());

        // use default status fallback
        contract.authorize_mint_with_code(489, accounts(3), sample_token_metadata("somehash".to_string()), None, 0, DEFAULT_TIER.to_string());

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(3))
            .predecessor_account_id(accounts(3))
            .build());

        let token = contract.mint_with_code(489);

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(4))
            .predecessor_account_id(accounts(4))
            .build());

        contract.set_verified_token(token.token_id.clone(), false);
    }

    #[test]
    #[ignore]
    fn test_status_setting_on_authorization() {
        let mut context = get_context(accounts(4));
        testing_env!(context.build());
        let mut contract = KycdaoNTNFT::new_default_meta("base3".to_string());

        // use default status fallback
        contract.authorize_mint_with_code(6547, accounts(4), sample_token_metadata("somehash".to_string()), Some(9000000000), 0, DEFAULT_TIER.to_string());

        testing_env!(context
            .block_timestamp(1664226405000000000)
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(4))
            .predecessor_account_id(accounts(4))
            .build());

        let token = contract.mint_with_code(6547);

        assert_eq!(contract.token_expiry(token.token_id.clone()), Some(9000000000));
        assert_eq!(contract.token_statuses.get(&token.token_id).unwrap().verified, true);
        assert_eq!(contract.has_valid_token(accounts(4)), true);
    }
}
