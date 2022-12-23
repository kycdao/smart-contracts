use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::AccountId;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PriceFeed {
    address: AccountId,
}

impl PriceFeed {
    pub fn new(address: AccountId) -> PriceFeed {
        PriceFeed { address }
    }

    pub fn last_price(&self) -> (u32, u8) {
        //unimplemented!("TODO")
        (17240, 4)
    }
}