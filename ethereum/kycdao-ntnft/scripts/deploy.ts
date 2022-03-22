const { ethers } = require('hardhat')
import { KycdaoNtnft } from '../src/types/KycdaoNtnft'

async function main() {
  const MemberNft = (await ethers.getContractFactory('KycdaoNTNFT')) as KycdaoNtnft

  const metadata_base_uri = 'https://ipfs.io/ipfs/'
  const verification_base_uri = 'https://kycdao.s3.amazonaws.com/metadata/'

  const memberNft = (await MemberNft.deploy('KYCDAO NFT', 'KYCDAO', metadata_base_uri, verification_base_uri)) as KycdaoNtnft

  console.log({ memberNft })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
