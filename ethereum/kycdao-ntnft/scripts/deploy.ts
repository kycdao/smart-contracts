const { ethers } = require('hardhat')
import { KycdaoNtnft } from '../src/types/KycdaoNtnft'

async function main() {
  const MemberNft = (await ethers.getContractFactory('KycdaoNTNFT')) as KycdaoNtnft

  const uri = 'https://kycdao.s3.amazonaws.com/metadata/'

  const memberNft = (await MemberNft.deploy('KYCDAO NFT', 'KYCDAO', uri)) as KycdaoNtnft

  console.log({ memberNft })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
