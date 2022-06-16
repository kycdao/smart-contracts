const { ethers, upgrades } = require('hardhat')
import { ContractFactory } from '@ethersproject/contracts'
import { KycdaoNTNFTAccreditation } from '../src/types/contracts/KycdaoNTNFTAccreditation'

async function main() {
  const KycdaoNTNFTAccredContract = (await ethers.getContractFactory('KycdaoNTNFTAccreditation')) as ContractFactory

  const args = {
    name: 'KYCDAO NFT',
    symbol: 'KYCDAO',
    metadata_base_uri: 'https://ipfs.io/ipfs/',
    verification_base_uri: 'https://kycdao.s3.amazonaws.com/metadata/',
  }

  console.log('Deploying KycdaoNTNFTAccreditation...')
  const KycdaoNTNFTAccreditationDeployed = await upgrades.deployProxy(KycdaoNTNFTAccredContract, [args.name, args.symbol, args.metadata_base_uri, args.verification_base_uri], {initializer: 'initialize', kind: 'uups'}) as KycdaoNTNFTAccreditation
  await KycdaoNTNFTAccreditationDeployed.deployed()
  console.log(`KycdaoNTNFTAccreditation deployed to: ${KycdaoNTNFTAccreditationDeployed.address}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
