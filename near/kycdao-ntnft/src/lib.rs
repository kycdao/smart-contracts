use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LazyOption};
use near_sdk::*;
use near_sdk::env::keccak256;
use near_contract_standards::upgrade::Ownable;
use near_contract_standards::ntnft::{Token, NTNFT, TokenId};
use near_contract_standards::ntnft::metadata::*;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct KycdaoNTNFT {
    tokens: NTNFT,
    metadata: LazyOption<NTNFTContractMetadata>,
    next_token_id: u128,
    mint_authorizer: AccountId,
    authorized_token_metadata: LookupMap<Vec<u8>, TokenMetadata>, // Track if token minting is authorized, store metadata
}

const DATA_IMAGE_SVG_ICON: &str = "data:image/svg+xml,%3csvg width='307' height='402' viewBox='0 0 307 402' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cmask id='path-1-inside-1_1367_8934' fill='white'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M305.999 26.6087L279.391 0L152.999 126.391L119.738 93.1305L93.1296 119.739L152.999 179.609L305.999 26.6087ZM0.00195312 26.6093L66.5238 93.1311L93.1325 66.5224L26.6107 0.000546972L0.00195312 26.6093Z'/%3e%3c/mask%3e%3cpath d='M279.391 0L282.219 -2.82843L279.391 -5.65685L276.562 -2.82843L279.391 0ZM305.999 26.6087L308.828 29.4372L311.656 26.6087L308.828 23.7803L305.999 26.6087ZM152.999 126.391L150.171 129.22L152.999 132.048L155.828 129.22L152.999 126.391ZM119.738 93.1305L122.567 90.3021L119.738 87.4737L116.91 90.3021L119.738 93.1305ZM93.1296 119.739L90.3012 116.911L87.4728 119.739L90.3012 122.568L93.1296 119.739ZM152.999 179.609L150.171 182.437L152.999 185.266L155.828 182.437L152.999 179.609ZM66.5238 93.1311L63.6953 95.9595L66.5238 98.7879L69.3522 95.9595L66.5238 93.1311ZM0.00195312 26.6093L-2.82647 23.7808L-5.6549 26.6093L-2.82647 29.4377L0.00195312 26.6093ZM93.1325 66.5224L95.9609 69.3508L98.7893 66.5224L95.9609 63.6939L93.1325 66.5224ZM26.6107 0.000546972L29.4391 -2.82788L26.6107 -5.65631L23.7822 -2.82788L26.6107 0.000546972ZM276.562 2.82843L303.171 29.4372L308.828 23.7803L282.219 -2.82843L276.562 2.82843ZM155.828 129.22L282.219 2.82843L276.562 -2.82843L150.171 123.563L155.828 129.22ZM116.91 95.959L150.171 129.22L155.828 123.563L122.567 90.3021L116.91 95.959ZM95.9581 122.568L122.567 95.959L116.91 90.3021L90.3012 116.911L95.9581 122.568ZM155.828 176.78L95.9581 116.911L90.3012 122.568L150.171 182.437L155.828 176.78ZM303.171 23.7803L150.171 176.78L155.828 182.437L308.828 29.4372L303.171 23.7803ZM69.3522 90.3026L2.83038 23.7808L-2.82647 29.4377L63.6953 95.9595L69.3522 90.3026ZM90.304 63.6939L63.6953 90.3026L69.3522 95.9595L95.9609 69.3508L90.304 63.6939ZM23.7822 2.82897L90.304 69.3508L95.9609 63.6939L29.4391 -2.82788L23.7822 2.82897ZM2.83038 29.4377L29.4391 2.82897L23.7822 -2.82788L-2.82647 23.7808L2.83038 29.4377Z' fill='%233D65F2' mask='url(%23path-1-inside-1_1367_8934)'/%3e%3cmask id='path-3-inside-2_1367_8934' fill='white'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M305.999 248.298L279.391 221.69L152.999 348.081L119.738 314.82L93.1295 341.429L152.999 401.299L305.999 248.298ZM0.00195312 248.299L66.5238 314.821L93.1325 288.212L26.6107 221.69L0.00195312 248.299Z'/%3e%3c/mask%3e%3cpath d='M279.391 221.69L282.219 218.861L279.391 216.033L276.562 218.861L279.391 221.69ZM305.999 248.298L308.828 251.127L311.656 248.298L308.828 245.47L305.999 248.298ZM152.999 348.081L150.171 350.91L152.999 353.738L155.828 350.91L152.999 348.081ZM119.738 314.82L122.567 311.992L119.738 309.163L116.91 311.992L119.738 314.82ZM93.1295 341.429L90.3011 338.601L87.4727 341.429L90.3011 344.257L93.1295 341.429ZM152.999 401.299L150.171 404.127L152.999 406.955L155.828 404.127L152.999 401.299ZM66.5238 314.821L63.6953 317.649L66.5238 320.478L69.3522 317.649L66.5238 314.821ZM0.00195312 248.299L-2.82647 245.471L-5.6549 248.299L-2.82647 251.127L0.00195312 248.299ZM93.1325 288.212L95.9609 291.04L98.7893 288.212L95.9609 285.384L93.1325 288.212ZM26.6107 221.69L29.4391 218.862L26.6107 216.033L23.7822 218.862L26.6107 221.69ZM276.562 224.518L303.171 251.127L308.828 245.47L282.219 218.861L276.562 224.518ZM155.828 350.91L282.219 224.518L276.562 218.861L150.171 345.253L155.828 350.91ZM116.91 317.649L150.171 350.91L155.828 345.253L122.567 311.992L116.91 317.649ZM95.958 344.257L122.567 317.649L116.91 311.992L90.3011 338.601L95.958 344.257ZM155.828 398.47L95.958 338.601L90.3011 344.257L150.171 404.127L155.828 398.47ZM303.171 245.47L150.171 398.47L155.828 404.127L308.828 251.127L303.171 245.47ZM69.3522 311.992L2.83038 245.471L-2.82647 251.127L63.6953 317.649L69.3522 311.992ZM90.304 285.384L63.6953 311.992L69.3522 317.649L95.9609 291.04L90.304 285.384ZM23.7822 224.519L90.304 291.04L95.9609 285.384L29.4391 218.862L23.7822 224.519ZM2.83038 251.127L29.4391 224.519L23.7822 218.862L-2.82647 245.471L2.83038 251.127Z' fill='%233D65F2' mask='url(%23path-3-inside-2_1367_8934)'/%3e%3cmask id='path-5-inside-3_1367_8934' fill='white'%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M-9.15527e-05 135.407L26.6086 108.798L153 235.19L186.261 201.929L212.87 228.538L153 288.407L-9.15527e-05 135.407ZM306.002 135.408L239.48 201.929L212.871 175.321L279.393 108.799L306.002 135.408Z'/%3e%3c/mask%3e%3cpath d='M26.6086 108.798L23.7802 105.97L26.6086 103.142L29.437 105.97L26.6086 108.798ZM-9.15527e-05 135.407L-2.82852 138.236L-5.65694 135.407L-2.82852 132.579L-9.15527e-05 135.407ZM153 235.19L155.828 238.018L153 240.847L150.172 238.018L153 235.19ZM186.261 201.929L183.433 199.101L186.261 196.272L189.089 199.101L186.261 201.929ZM212.87 228.538L215.698 225.709L218.527 228.538L215.698 231.366L212.87 228.538ZM153 288.407L155.828 291.236L153 294.064L150.172 291.236L153 288.407ZM239.48 201.929L242.309 204.758L239.48 207.586L236.652 204.758L239.48 201.929ZM306.002 135.408L308.83 132.579L311.659 135.408L308.83 138.236L306.002 135.408ZM212.871 175.321L210.043 178.149L207.215 175.321L210.043 172.492L212.871 175.321ZM279.393 108.799L276.565 105.971L279.393 103.142L282.222 105.971L279.393 108.799ZM29.437 111.627L2.82834 138.236L-2.82852 132.579L23.7802 105.97L29.437 111.627ZM150.172 238.018L23.7802 111.627L29.437 105.97L155.828 232.361L150.172 238.018ZM189.089 204.757L155.828 238.018L150.172 232.361L183.433 199.101L189.089 204.757ZM210.041 231.366L183.433 204.757L189.089 199.101L215.698 225.709L210.041 231.366ZM150.172 285.579L210.041 225.709L215.698 231.366L155.828 291.236L150.172 285.579ZM2.82834 132.579L155.828 285.579L150.172 291.236L-2.82852 138.236L2.82834 132.579ZM236.652 199.101L303.174 132.579L308.83 138.236L242.309 204.758L236.652 199.101ZM215.7 172.492L242.309 199.101L236.652 204.758L210.043 178.149L215.7 172.492ZM282.222 111.627L215.7 178.149L210.043 172.492L276.565 105.971L282.222 111.627ZM303.174 138.236L276.565 111.627L282.222 105.971L308.83 132.579L303.174 138.236Z' fill='%233D65F2' mask='url(%23path-5-inside-3_1367_8934)'/%3e%3c/svg%3e";

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

    // TODO add verificationDataBaseURI? or should we use the base_uri
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
                sender.to_owned(),
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
    /// @dev Mint the token by using a code from an authorized account
    #[payable]
    pub fn mint(&mut self, auth_code: u128) -> Token {
        let dst = env::predecessor_account_id();

        let digest = KycdaoNTNFT::get_digest(auth_code, &dst);

        // Get prefilled metadata, also remove digest so it cannot be used again
        let metadata = self.authorized_token_metadata.remove(&digest).expect("Unauthorized code");

        let token_id = self.next_token_id;
        self.next_token_id = self.next_token_id.checked_add(1).expect("Token ID overflow");
        let token_id_str = token_id.to_string();

        self.tokens.internal_mint(token_id_str, dst, Some(metadata), None)
    }

    // TODO this has a storage cost!
    // TODO add verification path?
    /// @dev Authorize the minting of a new token
    pub fn authorize_minting(&mut self, auth_code: u128, dst: AccountId, metadata: TokenMetadata) {
        self.assert_mint_authorizer();
        let digest = KycdaoNTNFT::get_digest(auth_code, &dst);

        let authorized_opt = self.authorized_token_metadata.get(&digest);
        assert!(authorized_opt.is_none(), "Code already authorized");

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

    // TODO tokenVerificationURI???

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

    // TODO setVerificationBaseURI???

    /*****************
    HELPERS
    *****************/
    fn get_digest(auth_code: u128, dst: &AccountId) -> Vec<u8> {
        let contract_addr = env::current_account_id();
        keccak256(format!("{}{}{}", auth_code, dst, contract_addr).as_bytes())
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

        contract.mint(123);
    }
}
