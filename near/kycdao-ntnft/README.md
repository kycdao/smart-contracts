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
  - call the deployment command: `near deploy deploytest.kycdao.testnet res\kycdao_ntnft.wasm`

## Initializing the contract after first deployment
Initialize it with the following command:
`near call <contract_acc> new_default_meta "{\"base_uri\":\"something\"}" --accountId <contract_acc>`