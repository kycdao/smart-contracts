# smart-contracts

###  kycNFT smart contracts by kycDAO


The kycDAO smart contracts can be utilized to verify the compliance of a specific address by determining the presence of valid kycNFT. These contracts can be invoked on-chain and serve as a means of controlling access to certain actions, only allowing those wallet addresses with valid kycNFT to proceed.

The implementation details for gating differ slightly for each blockchain, however it will mostly amount to simply calling a function such as `hasValidToken(addr)` with an address to be checked. The response being a boolean value to say whether the address has a current valid KYC token.


To integrate on-chain gating to your smart contracts please visit https://docs.kycdao.xyz/smartcontracts/
