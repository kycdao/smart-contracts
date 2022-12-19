use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::AccountId;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PriceFeed {
    address: AccountId,
    last_price: (u32, u8),
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PriceFeedMocked {
    address: AccountId,
    last_price: (u32, u8),
}

impl PriceFeedMocked {
    pub fn new(address: AccountId) -> Self {
        PriceFeedMocked {
            address,
            last_price: (17370, 4)
        }
    }

    pub fn set_last_price(&mut self, price: u32, decimals: u8) {
        self.last_price = (price, decimals);
    }

    pub fn last_price(&self) -> (u32, u8) {
        self.last_price
    }
}