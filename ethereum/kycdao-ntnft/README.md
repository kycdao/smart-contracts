# KYCDAO Non-transferable NFT - Solidity

For details on making compatible changes to the contracts please see [Upgrades.md](./Upgrades.md)

## Install

Install all required packages with:
`npm install`

## Compiling

To ensure all the TypeScript type files are available to tasks and tests, compile with:
`npm run compile`

## Testing

Tests are split into simple unit tests and a slightly more extensive set of tests which run a local chain and also spin up a demo Gas Station Network (GSN) for testing GSN transactions as well.

To execute unit tests:
`npm run test`

To execute all tests, incl. GSN:
`npm run testLocal`

There is a separate hardhat task which uses OpenZeppelin's Upgrades Plugin to confirm a contract's code is 'upgrade compatible'. It does this by using the plugin to deploy the contract to a local node, i.e. it expects a local node to be running already.

Run it with:
`npx hardhat testUpgrade --contract CONTRACT_NAME --network localhost`

## Config
The hardhat config file `hardhat.config.ts` lists most config (which is loaded whenever a hardhat task is run). It includes all the network details. You can specify private keys as strings under `accounts` or create a `mnemonic.txt` with a seed (and also a `test_mnemonic.txt` for the test networks).

A `.env` file is also used for secure env variables like API keys used for INFURA and verifying on ether/polygonscan. See `.env.example`.

## Running a local node
You can start a local node (with GSN) to test out deployment with: `npm run local` this becomes the `localhost` network, which uses the default accounts (i.e. `mnemonic.txt` isn't used)

## Deployment
Deployment is handled through a custom hardhat task [`deploy`](./tasks/deploy.ts)

Example:
`npx hardhat deploy --contract KycdaoNTNFT --salt 'KycdaoNTNFT v1.0' --network mumbai`

As we use [xdeploy](https://github.com/pcaversaccio/xdeployer) (`CREATE2`) for deployment, a deterministic address is always used, regardless of network. Hence `salt` is simply a string used to ensure a unique address is generated - i.e. if `salt` is the same, the same address is generated. If the same `salt` is used to deploy again on the same network, an error will occur saying there is already a contract deployed to that address.

## Deploying upgrades
Upgrades of existing contracts using proxies can be done with the [`upgrade`](./tasks/upgrade.ts)

Example: `npx hardhat upgrade --contract KycdaoNTNFT --proxy-address "0xd9b477cD1a8f8942Aa1054aF1910f0A8cC824694" --network mumbai`

## Verify source code on Etherscan / Polygonscan
Verifying contract source should mostly be handled by the hardhat tasks mentioned above. If it fails for some reason you can run it with:

`npx hardhat verify CONTRACT_ADDR --network NETWORK`

NOTE: When verifying through a proxy, the proxy address is specified but the logic/implementation source is what is actually verified. It's also worth navigating to the proxy's address in the scanner to confirm it's a proxy (More Options -> Is this a proxy? -> e.t.c.) and has the correct implementation address, this way the implementation's functionality can be used via the proxy's address.

## Console
You can interact with a deployed contract via: `npx hardhat console --network <NETWORK>`
It's a standard node REPL. There's a `loadenv.js` file which loads standard vars for use when interacting with the contract. Ensure the contract address is correct for the network you want to use!
Keys used by the console for non-local chains will come from `mnemonic.txt`