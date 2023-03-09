[![codecov](https://codecov.io/gh/kycdao/smart-contracts/branch/main/graph/badge.svg?token=U9NMQ7VJ9S)](https://codecov.io/gh/kycdao/smart-contracts)
# KYCDAO Non-transferable NFT - Solidity

For details on making compatible changes to the contracts please see [Upgrades.md](./Upgrades.md)

## Install

Install all required packages with:
`npm install`

## Compiling

To ensure all the TypeScript type files are available to tasks and tests, compile with:
`npm run compile`

## Testing

Tests are split into simple unit tests and tests which run a local chain and also spin up a demo Gas Station Network (GSN) for testing GSN transactions as well.

To execute unit tests:
`npm run test`

To execute GSN tests:
`npm run testGsn`

There is a separate hardhat task which uses OpenZeppelin's Upgrades Plugin to confirm a contract's code is 'upgrade compatible'. It does this by using the plugin to deploy the contract to a local node, i.e. **it expects a local node to be running already.**

Run it with:
`npx hardhat testUpgrade --contract CONTRACT_NAME --network localhost`

There are now tests explicitly dedicated to ensure upgrades run correctly (i.e. [KycdaoNTNFT_upgrade.ts](./test/KycdaoNTNFT_upgrade.ts)). These tests start with the 'old' version of the contract, run some test mints, upgrade to the latest version of the contract, then proceed to run the full test suite.

## Config
The hardhat config file `hardhat.config.ts` lists most config (which is loaded whenever a hardhat task is run). It includes all the network details. You can specify private keys as strings under `accounts` or create a `mnemonic.txt` with a seed (and also a `test_mnemonic.txt` for the test networks).

A `.env` file is also used for secure env variables like API keys used for INFURA and verifying on ether/polygonscan. See `.env.example`.

## Running a local node
You can start a local node (with GSN) to test out deployment with: `npm run local` this becomes the `localhost` network, which uses the default accounts (i.e. `mnemonic.txt` isn't used)

## Deployment
Deployment is handled through a custom hardhat task [`deploy`](./tasks/deploy.ts)

Make sure you've set the `ETHERSCAN_API_KEY` and/or `POLYGONSCAN_API_KEY` environment variables!

Example:
`npx hardhat deploy --contract KycdaoNTNFT --salt KycdaoNTNFT_KYC --network mumbai`
OR
`npx hardhat deploy --contract KycdaoNTNFTAccreditation --salt KycdaoNTNFT_AccreditedInvestor --network mumbai`

As we use [xdeploy](https://github.com/pcaversaccio/xdeployer) (`CREATE2`) for deployment, a deterministic address is always used, regardless of network. Hence `salt` is simply a string used to ensure a unique address is generated - i.e. if `salt` is the same, the same address is generated. If the same `salt` is used to deploy again on the same network, an error will occur saying there is already a contract deployed to that address.

The `deploy` task has a few steps:

1. Deploy the logic (implementation) contract (if necessary)
2. Deploy a price feed contract for the given chain (if necessary)
3. Using `xdeploy`, deploy the proxy contract to a deterministic address
4. Initialize the proxy contract with the implementation contract
5. Verify the source for the logic (implementation) contract

For both step 1 and 2 (the deployment of implementation and price feed) - the task uses files in the `deployments/` directory to see any existing implementation and uses this instead of redeploying.

Additionally, at the start of the script, it will check network congestion and in the case it is high (meaning a potentially high gas cost), it will ask the user if they'd like to continue.

### Gas costs

For most networks, automatic gas cost calculation is fine (i.e. you can do nothing). However, for some (**Hi Polygon!**) it is required to use an API to check gas costs before each transaction. The script uses a fixed array to determine which networks require this gas cost calculation:

`const NETWORKS_MANUAL_GAS = ['polygon']`

Feel free to add any other networks to this array if you are having trouble with gas costs during deployment.

## Deploying upgrades
Upgrades of existing contracts using proxies can be done with the [`upgrade`](./tasks/upgrade.ts) task.

Example: `npx hardhat upgrade --contract KycdaoNTNFT --proxy-address "<PUT PROXY ADDR HERE>" --network mumbai`

**NOTE:** The `upgrade` task now expects a `_migrate` function to be present on the contract, which checks the current `storageVersion` and compares to the version returned by `version()` to see what migration needs to take place for stored variables from one version to another. The `_migrate` function is then run at the time of running the upgrade.

## Verify source code on Etherscan / Polygonscan e.t.c.
Verifying contract source should mostly be handled by the hardhat tasks mentioned above. If it fails for some reason you can run it with:

`npx hardhat verify CONTRACT_ADDR --network NETWORK`

NOTE: When verifying through a proxy, the proxy address is specified but the logic/implementation source is what is actually verified. It's also worth navigating to the proxy's address in the scanner to confirm it's a proxy (More Options -> Is this a proxy? -> e.t.c.) and has the correct implementation address, this way the implementation's functionality can be used via the proxy's address.

## Console
You can interact with a deployed contract via: `npx hardhat console --network <NETWORK>`
It's a standard node REPL. There's a `loadenv.js` file which loads standard vars for use when interacting with the contract. Ensure the contract address is correct for the network you want to use!
Keys used by the console for non-local chains will come from `test_mnemonic.txt` (test networks) and `mnemonic.txt` (mainnet).

## Retrieving balance from contract
When users make payments to the contract these assets (such as MATIC) are stored in the Proxy contract itself.

An address with the `OWNER` role can set the safe address with the following function:
`function setSafeAddress(address payable recipient_) public;`

Then anyone can run the following function to send the current balance of the contract to the stored safe address:

`function sendBalanceToSafe() public;`
