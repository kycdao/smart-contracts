use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LazyOption};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey, Balance, Promise};
use near_sdk::env::keccak256;
use near_contract_standards::upgrade::Ownable;
use near_contract_standards::ntnft::{Token, NTNFT, TokenId};
use near_contract_standards::ntnft::metadata::*;
use std::convert::TryInto;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct KycdaoNTNFT {
    tokens: NTNFT,
    metadata: LazyOption<NTNFTContractMetadata>,
    next_token_id: u128,
    mint_authorizer: AccountId,
    authorized_token_metadata: LookupMap<Vec<u8>, TokenMetadata>, // Track if token minting is authorized, store metadata
}

// TODO change this
const DATA_IMAGE_SVG_ICON: &str = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 288 288'%3E%3Cg id='l' data-name='l'%3E%3Cpath d='M187.58,79.81l-30.1,44.69a3.2,3.2,0,0,0,4.75,4.2L191.86,103a1.2,1.2,0,0,1,2,.91v80.46a1.2,1.2,0,0,1-2.12.77L102.18,77.93A15.35,15.35,0,0,0,90.47,72.5H87.34A15.34,15.34,0,0,0,72,87.84V201.16A15.34,15.34,0,0,0,87.34,216.5h0a15.35,15.35,0,0,0,13.08-7.31l30.1-44.69a3.2,3.2,0,0,0-4.75-4.2L96.14,186a1.2,1.2,0,0,1-2-.91V104.61a1.2,1.2,0,0,1,2.12-.77l89.55,107.23a15.35,15.35,0,0,0,11.71,5.43h3.13A15.34,15.34,0,0,0,216,201.16V87.84A15.34,15.34,0,0,0,200.66,72.5h0A15.35,15.35,0,0,0,187.58,79.81Z'/%3E%3C/g%3E%3C/svg%3E";

// TODO make this changeable
// actually there's 2 different costs (KYC 2 USD, AccreditedInvestor 40 USD)
const MINTING_COST: Balance = near_sdk::ONE_NEAR;

// TODO get a NEAR-USD oracle

#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    AuthorizedTokenMetadata,
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

        Self {
            tokens: NTNFT::new(
                StorageKey::NonFungibleToken,
                sender.to_owned().try_into().unwrap(),
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            next_token_id: 0,
            mint_authorizer: sender.to_owned(),
            authorized_token_metadata: LookupMap::new(StorageKey::AuthorizedTokenMetadata),
        }
    }

    /*****************
    Authorized Minting
    *****************/
    /// @dev Mint the token by using a nonce from an authorized account
    #[payable]
    pub fn mint(&mut self, nonce: u128) -> Token {
        let dst = env::predecessor_account_id();

        let attached_deposit = env::attached_deposit();
        assert!(attached_deposit > MINTING_COST, "Please attach a minting cost of {} yoctoNEAR", MINTING_COST);

        // TODO are we sending it to the owner? or to a separate treasury?
        // what's the default behaviour for unspent attached deposit?
        Promise::new(self.tokens.owner_id.to_owned()).transfer(MINTING_COST);

        let digest = KycdaoNTNFT::get_digest(nonce, &dst);

        // Get prefilled metadata, also remove digest so it cannot be used again
        let metadata = self.authorized_token_metadata.remove(&digest).expect("Unauthorized nonce");

        let token_id = self.next_token_id;
        self.next_token_id = self.next_token_id.checked_add(1).expect("Token ID overflow");
        let token_id_str = token_id.to_string();

        self.tokens.internal_mint(token_id_str, dst, Some(metadata), Some(MINTING_COST))
    }

    // TODO this has a storage cost!
    /// @dev Authorize the minting of a new token
    pub fn authorize_minting(&mut self, nonce: u128, dst: AccountId, metadata: TokenMetadata) {
        self.assert_mint_authorizer();
        let digest = KycdaoNTNFT::get_digest(nonce, &dst);

        let authorized_opt = self.authorized_token_metadata.get(&digest);
        assert!(authorized_opt.is_none(), "Nonce already authorized");

        self.authorized_token_metadata.insert(&digest, &metadata);
    }

    /*****************
    Public interfaces
    *****************/
    pub fn token_uri(&self, token_id: TokenId) -> String {
        let token_metadata_store = self.tokens.token_metadata_by_id.as_ref().expect("Metadata not supported");
        let token_metadata: TokenMetadata = token_metadata_store.get(&token_id).expect("Token not found");

        let contract_metadata = self.metadata.get().expect("Metadata not supported");
        let base_uri = contract_metadata.base_uri.expect("Missing base_uri");
        assert!(!base_uri.is_empty(), "Empty base_uri");

        format!("{}/{}.json", base_uri, token_metadata.extra.expect("Missing token extra data"))
    }

    /*****************
    Config
    *****************/
    /// @notice Set new base URI for references
    /// @param base_uri String to prepend references
    pub fn set_base_uri(&mut self, base_uri: String) {
        self.assert_owner();
        let mut metadata = self.metadata.get().expect("Metadata not supported");
        metadata.base_uri = Some(base_uri);
    }

    /*****************
    HELPERS
    *****************/
    fn get_digest(nonce: u128, dst: &AccountId) -> Vec<u8> {
        let contract_addr = env::current_account_id();
        keccak256(format!("{}{}{}", nonce, dst, contract_addr).as_bytes())
    }

    fn assert_mint_authorizer(&self) {
        assert_eq!(env::predecessor_account_id(), self.get_mint_authorizer());
    }

    pub fn get_mint_authorizer(&self) -> AccountId {
        self.assert_owner();
        self.mint_authorizer.clone()
    }

    pub fn set_mint_authorizer(&mut self, authorizer: AccountId) {
        self.assert_owner();
        self.mint_authorizer = authorizer;
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
    const MINT_COST: u128 = near_sdk::ONE_NEAR;

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

    #[test]
    fn test_new() {
        let mut context = get_context(accounts(1));
        testing_env!(context.build());
        let contract = KycdaoNTNFT::new_default_meta("base".to_string());
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

        contract.authorize_minting(123, accounts(2), sample_token_metadata("somehash".to_string()));
        contract.authorize_minting(365, accounts(2), sample_token_metadata("othersomehash".to_string()));

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(2))
            .predecessor_account_id(accounts(2))
            .build());

        let token = contract.mint(365);
        assert_eq!(token.token_id, "0".to_string());
        assert_eq!(token.owner_id, accounts(2));
        assert_eq!(token.metadata.unwrap(), sample_token_metadata("othersomehash".to_string()));

        testing_env!(context
            .storage_usage(env::storage_usage())
            .attached_deposit(MINT_STORAGE_COST + MINT_COST)
            .signer_account_id(accounts(2))
            .predecessor_account_id(accounts(2))
            .build());

        let token = contract.mint(123);
        assert_eq!(token.token_id, "1".to_string());
        assert_eq!(token.owner_id, accounts(2));
        assert_eq!(token.metadata.unwrap(), sample_token_metadata("somehash".to_string()));
    }

    #[test]
    #[should_panic(expected = "Unauthorized nonce")]
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

        contract.mint(123);
    }
}
