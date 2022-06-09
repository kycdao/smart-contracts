const { ethers, upgrades } = require('hardhat')
import { ContractFactory } from '@ethersproject/contracts'
import { KycdaoNTNFT } from '../src/types/contracts/KycdaoNTNFT'

const PROXY_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F"

async function main() {
  const KycdaoNTNFTContract = (await ethers.getContractFactory('KycdaoNTNFT')) as ContractFactory

  console.log('Upgrading KycdaoNTNFT...')
  await upgrades.upgradeProxy(PROXY_ADDRESS, KycdaoNTNFTContract)
  console.log('KycdaoNTNFT upgraded')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
