# KYCDAO on Solana

Implementing KYCDAO on Solana is quite different to Ethereum. The biggest difference is Solana's split between execution and data storage. Where in Ethereum a smart contract can include an inherited interface, the implementation of that interface with customizations and the data associated with this implementation, Solana takes a more modular approach. In Solana, these things are all separated into 'Accounts' - a Program Account which stores execution information and Accounts for data storage.

The closest thing to the equivalent of the ERC-20 and ERC-721 standards (for fungible and non-fungible tokens) would be the [Token Program](https://spl.solana.com/token), also referred to as `spl-token`, within the [Solana Program Library](https://spl.solana.com). The SPL is a collection of on-chain programs (the closest equivalent of contracts), deployed to mainnet, intended to be re-used by all those attempting to conform to the same standards.

Unlike in Ethereum where each smart contract would simply use the ERC-721 interface as a base for deploying their new contract, in Solana new tokens would almost all utilize one of the existing mainnet deployments of the `spl-token` program and implement their specific token by changing the associated 'data' Accounts. Without going into too much detail, this customization is typically done by:

- Setting the fields of the 'Mint Account' for that token approriately, such as: `decimals`, `supply`, `mint_authority`.
- By creating a 'Metadata Account' that the token uses for typical fields like: `name`, `symbol`, `URI` e.t.c.

## Solutions for implementing a non-transferable NFT

Transferring tokens in Solana is done by calling the `Transfer` instruction within the `spl-token` program. As the `spl-token` implementation is standardised and used by almost all tokens, it means preventing transfers is a little trickier than simply "deploying your own token with no `transfer` functionality".

### Implement a new 'NonTransferable' token standard in the SPL

The most obvious way to implement a non-transferable NFT would be by updating the `spl-token` program itself to prevent transfers when an NFT is specified with some flag such as `NonTransferable`.

This has already been discussed on the SPL repo: [#2909](https://github.com/solana-labs/solana-program-library/issues/2909)

The associated [PR](https://github.com/solana-labs/solana-program-library/pull/2912) implements this by adding an extension `NonTransferable`, which when specified only allows minting to accounts with immutable ownership.

This solution would work well and is probably the best long term solution. Having explicit handling for non-transferables is far better than implementing it as a side-effect, especially for signalling clients (wallets).

However, it's unknown when this PR would be accepted and included in the official `spl-token` release.

### Utilize 'freeze_authority'

Another method for preventing transfers which doesn't require any changes to the existing `spl-token` would be to utilize `FreezeAccount` and `freeze_authority` (as specified in the SPL [here](https://spl.solana.com/token#freezing-accounts)).

When an account is frozen, no further actions, such as transfers are possible. When the `freeze_authority` is then set to `None` it means the ability to 'thaw' the account is prevented, meaning it is not possible to transfer it anymore.

## Using Metaplex for metadata

When referring to a standard specification for the associated metadata for an NFT, it seems as though [Metaplex](https://docs.metaplex.com/token-metadata/specification) is the most used standard in Solana today. It would make sense to use their specification for metadata for KYCDAO's NTNFTs.