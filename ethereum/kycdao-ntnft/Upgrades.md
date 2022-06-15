# Making changes to contracts via upgrades

The EVM smart contract for kycDAO's NFT is now upgradeable, i.e. we can make changes to the contract and deploy them without changing the address used by clients.

As the concept of upgradeability is by no means built-in to the EVM, all the solutions for implementing upgradeability will include some drawbacks or things to keep in mind when making future changes, lest they cause problems.

This document is intended to be a guide to those making changes.

## Current implementation

The current implementation uses [OpenZeppelin's Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/). The plugin makes the life of developers a lot easier by running checks on smart contract code during initial deployment and upgrades, to ensure that the basic rules for upgrading are adhered to and there's no chance of 'breaking' the contract.

The most common solution for implementing upgradeability is the Proxy pattern - essentially a proxy contract is used as the address pointed to by clients. The proxy contract then delegates all incoming requests to run functions to the currently assigned logic contract. At any time you can then deploy a new logic contract and update the logic contract reference which the proxy contract points to.

We are specifically using UUPS ([EIP-1822: Universal Upgradeable Proxy Standard](https://eips.ethereum.org/EIPS/eip-1822)) - essentially all the code for updating the proxy is instead included in the logic contract. The proxy contract itself is almost an empty wrapper, simply with code for delegating function calls. It's a simple and lightweight solution and also has the possibility of us removing upgradeability in the future. The function used to upgrade contracts is `_authorizeUpgrade` and is currently restricted to run only by the `OWNER_ROLE`.

More UUPS info:
- [UUPS Proxies: Tutorial (Solidity + JavaScript)](https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786)
- [Transparent vs UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups)


## Making changes

As mentioned, the OZ upgrades plugin has your back if you're unsure - if you make a mistake, it'll tell you before deploying the upgrade.

The best document to read which gives the list of limitations when writing upgradeable contracts is this [Open Zeppelin guide](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)

But as a super quick summary:
- Constructors cannot be used, functions called `initializers` are used instead. Which means you will need to manually call your super classes `initialize`.
- You can't initialize (non-constant) variables outside of functions
- You can't declare new variables before existing ones (this includes inherited variables from super classes!)
- You can't change the type of existing variables

A [script](./scripts/upgrade.ts) is written for deploying the upgrade, it simply requires the address of the existing proxy (the address used by clients), as well as the compiled version of the new contract to be deployed.

Keep in mind, when deploying upgrades, some clients will still be using the old version of the contract (ABI) when interacting with it. This means backwards compatibility must be kept in mind, i.e. existing functions should remain.