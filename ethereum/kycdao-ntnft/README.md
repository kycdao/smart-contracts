# KYCDAO Non-transferable NFT - Solidity

## Testing
To execute the tests simply run: 
`npm run test`

## Config
The hardhat config file `hardhat.config.ts` lists all config (which is loaded whenever a hardhat task is run). It includes all the network details. It assumes a `mnemonic.txt` file exists which it uses for accounts.

## Running a local node
You can start a local node to test out deployment with: `npx hardhat node` this becomes the `localhost` network, which uses the default accounts (i.e. `mnemonic.txt` isn't used)

## Deployment
`scripts/deploy.ts` is used for deployment, it includes the constructor args such as `name, symbol, baseURI`.

Run it with `npx hardhat run --network <NETWORK> scripts/deploy.ts`

## Verify source code on Etherscan / Polygonscan
Update constructor params in contructorArgs.js, then call:

`npx hardhat verify --constructor-args constructorArgs.js CONTRACT_ADDR --network mumbai`

## Console
You can interact with a deployed contract via: `npx hardhat console --network <NETWORK>`
It's a standard node REPL. There's a `loadenv.js` file which loads standard vars for use when interacting with the contract. Ensure the contract address is correct for the network you want to use!