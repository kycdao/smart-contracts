const { ethers } = require('hardhat')
import { KycdaoNtnft } from '../src/types/KycdaoNtnft'

async function main() {
  const MemberNft = (await ethers.getContractFactory('KycdaoNTNFT')) as KycdaoNtnft

  const uri = 'https://minty-dev-assets.s3.amazonaws.com/nt/'

  const memberNft = (await MemberNft.deploy('member', 'MEMBER', uri)) as KycdaoNtnft

  console.log({ memberNft })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
