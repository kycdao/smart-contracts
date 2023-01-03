use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::AccountId;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PriceFeed {
    address: AccountId,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PriceFeedMocked {
    address: AccountId,
    latest_price: (u32, u8),
}

impl PriceFeedMocked {
    pub fn new(address: AccountId) -> Self {
        PriceFeedMocked {
            address,
            latest_price: (17370, 4)
        }
    }

    pub fn set_latest_price(&mut self, price: u32, decimals: u8) {
        self.latest_price = (price, decimals);
    }

    pub fn latest_price(&self) -> (u32, u8) {
        self.latest_price
    }
}