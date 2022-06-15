const { ethers, upgrades } = require('hardhat')
import { ContractFactory } from '@ethersproject/contracts'
import { KycdaoNTNFTAccreditation } from '../src/types/contracts/KycdaoNTNFTAccreditation'

const PROXY_ADDRESS = "0x0B306BF915C4d645ff596e518fAf3F9669b97016"

async function main() {
  const KycdaoNTNFTAccredContract = (await ethers.getContractFactory('KycdaoNTNFTAccreditation')) as KycdaoNTNFTAccreditation

  console.log('Upgrading KycdaoNTNFTAccreditation...')
  await upgrades.upgradeProxy(PROXY_ADDRESS, KycdaoNTNFTAccredContract)
  console.log('KycdaoNTNFTAccreditation upgraded')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
