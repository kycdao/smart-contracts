# KYCDAO Non-transferable NFT - NEAR

## Testing
To execute the tests simply run: 
`cargo test`

## Setting the network to be used
Set the NEAR_ENV variable to `localnet` / `testnet` / `mainnet` with the following command:
- on Linux: `export NEAR_ENV=localnet`
- on Windows: `set NEAR_ENV=localnet`

## Setting up Localnet for testing
Run a Localnet instance with the following command:

On Linux:
    
`docker run -v $HOME/.near:/root/.near -p 3030:3030 --name nearup nearup/nearprotocol run localnet`

On Windows:
    
`docker run -v %HOME%/.near:/root/.near -p 3030:3030 --name nearup nearup/nearprotocol run localnet`

## Dev-Deployment
Use `yarn run deploy:dev` to deploy the smart contract to a temporary dev account. The result should be something like this:
```
Starting deployment. Account id: dev-1654805931970-36988039000638, node: https://rpc.testnet.near.org, helper: https://helper.testnet.near.org, file: res/kycdao_ntnft.wasm
Transaction Id 6TtQ5yXraEnoRpKQYbRnyTH6MWx3zXhGguU7ToNevYuW
To see the transaction in the transaction explorer, please open this url in your browser
https://explorer.testnet.near.org/transactions/
Done deploying to dev-1654805931970-36988039000638
```

## Deployment to a specific (non-temporary) account
  - set the network you want to use for deployment
  - login as the owner of the account with `near login`
  - build the latest version with: `npm run build`
  - call the deployment command: `near deploy deploytest.kycdao.testnet res\kycdao_ntnft.wasm`

## Initializing the contract after first deployment
Initialize it with the following command:
`near call <contract_acc> new_default_meta "{\"base_uri\":\"something\"}" --accountId <contract_acc>`

## Upgrading a contract
You can simply call `near deploy` again to upgrade a contract. Note: If you change anything in the contract state (`KycdaoNTNFT` struct), then you'll have to write a `migrate` function and call it manually after deployment.
The `migrate` function needs the old version of the struct, so it can read the old state before creating the new one. The function should look something like this:
```rust
#[private]
#[init(ignore_state)]
pub fn migrate() -> Self {
    let old_state: OldKycdaoNTNFT = env::state_read().expect("failed");
    Self {
        tokens: old_state.tokens,
        metadata: old_state.metadata,
        next_token_id: old_state.next_token_id,
        mint_authorizer: old_state.mint_authorizer,
        authorized_token_metadata: old_state.authorized_token_metadata,
        authorized_statuses: UnorderedMap::new(StorageKey::AuthorizedStatuses),
        token_statuses: UnorderedMap::new(StorageKey::TokenStatuses),
    }
}
```

## Calling migration after state change
`near call deploytest.kycdao.testnet migrate "{}" --accountId deploytest.kycdao.testnet`

After a successful migration, you can remove the `migrate` function and the old state struct, and redeploy the contract again without them.
