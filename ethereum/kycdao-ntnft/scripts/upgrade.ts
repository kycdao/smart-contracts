const { ethers, upgrades } = require('hardhat')
import { ContractFactory } from '@ethersproject/contracts'
import { KycdaoNTNFT } from '../src/types/contracts/KycdaoNTNFT'

const PROXY_ADDRESS = "0x0B306BF915C4d645ff596e518fAf3F9669b97016"

async function main() {
  const KycdaoNTNFTAccredContract = (await ethers.getContractFactory('KycdaoNTNFTAccreditation')) as ContractFactory

  console.log('Upgrading KycdaoNTNFT to KycdaoNTNFTAccredContract...')
  await upgrades.upgradeProxy(PROXY_ADDRESS, KycdaoNTNFTAccredContract)
  console.log('KycdaoNTNFT upgraded')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
