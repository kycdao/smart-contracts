const { ethers, upgrades } = require('hardhat')
import { ContractFactory } from '@ethersproject/contracts'
import { KycdaoNTNFT } from '../src/types/contracts/KycdaoNTNFT'

async function main() {
  const KycdaoNTNFTContract = (await ethers.getContractFactory('KycdaoNTNFT')) as ContractFactory

  const args = {
    name: 'KYCDAO NFT',
    symbol: 'KYCDAO',
    metadata_base_uri: 'https://ipfs.io/ipfs/',
    verification_base_uri: 'https://kycdao.s3.amazonaws.com/metadata/',
  }

  console.log('Deploying KycdaoNTNFT...')
  const kycdaoNTNFTDeployed = await upgrades.deployProxy(KycdaoNTNFTContract, [args.name, args.symbol, args.metadata_base_uri, args.verification_base_uri], {initializer: 'initialize', kind: 'uups'}) as KycdaoNTNFT
  await kycdaoNTNFTDeployed.deployed()
  console.log(`kycdaoNTNFT deployed to: ${kycdaoNTNFTDeployed.address}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
