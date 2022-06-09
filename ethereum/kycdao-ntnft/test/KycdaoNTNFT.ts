// @ts-ignore
import { ethers, upgrades } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { KycdaoNTNFT } from '../src/types/contracts/KycdaoNTNFT'
import { NTConsumerExample } from '../src/types/contracts/NTConsumerExample.sol/NTConsumerExample'
import { Wallet } from '@ethersproject/wallet'
import { ContractFactory } from '@ethersproject/contracts'

use(solidity)

// chai
//   .use(require('chai-as-promised'))
//   .should();

const zeroAddress = '0x0000000000000000000000000000000000000000'

const minterRole = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])
const ownerRole = ethers.utils.solidityKeccak256(['string'], ['OWNER_ROLE'])

const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000'

const testKey = '0xdd631135f3a99e4d747d763ab5ead2f2340a69d2a90fab05e20104731365fde3'

async function blockTime() {
  const block = await ethers.provider.getBlock('latest')
  return block.timestamp
}

describe.only('KycdaoNtnft Membership', function () {
  let memberNft: KycdaoNTNFT
  let memberNftAsMinter: KycdaoNTNFT
  let memberNftAsAnyone: KycdaoNTNFT

  let deployer: SignerWithAddress
  let minter: SignerWithAddress
  let anyone: SignerWithAddress

  let author: Wallet

  let MemberNft: ContractFactory

  this.beforeAll(async function () {
    ;[deployer, minter, anyone] = await ethers.getSigners()

    const adminAbstract = new ethers.Wallet(testKey)
    const provider = ethers.provider
    author = await adminAbstract.connect(provider)

    MemberNft = await ethers.getContractFactory('KycdaoNTNFT')
  })

  beforeEach(async function () {
    const memberNftAbstract = await upgrades.deployProxy(MemberNft, ['test', 'TEST', 'metadataURI', 'verificationURI'], {initializer: 'initialize', kind: 'uups'}) as KycdaoNTNFT
    await memberNftAbstract.deployed()
    memberNft = await memberNftAbstract.connect(deployer)
    memberNftAsMinter = await memberNftAbstract.connect(minter)
    memberNftAsAnyone = await memberNftAbstract.connect(anyone)

    await memberNft.grantRole(minterRole, minter.address)
    await memberNft.grantRole(minterRole, author.address)
  })

  describe('minting', function () {
    describe('mint  admin', function () {
      it('Authorize minter to mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234")
        expect(await memberNft.balanceOf(anyone.address)).to.equal(0)
      })
    })

    describe('mint  with nonce', function () {
      it('Mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234")
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
        expect(await memberNft.tokenURI(1), "metadataURI/ABC123")
      })

      it('Updates total supply ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234")
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.totalSupply()).to.equal(1)
      })

      it('Allows enumeration ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234")
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.tokenOfOwnerByIndex(anyone.address, 0)).to.equal(1)
        expect(await memberNft.tokenByIndex(0)).to.equal(1)
      })

      it('Fails if mint used twice', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234")
        await memberNftAsAnyone.mint(456)
        expect(memberNftAsAnyone.mint(456)).to.be.revertedWith('Unauthorized code')
      })
    })

    describe('no transfers', function () {
      it('Does not allow tokens to be transferred', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, "ABC123", "uidasd")
        await memberNftAsAnyone.mint(123)
        expect(memberNftAsAnyone.transferFrom(anyone.address, author.address, 1)).to.be.revertedWith('Not transferable!')
      })
    })
  })
})

describe.only('KycdaoNTNFT Memberships Consumer', function () {
  let memberNft: KycdaoNTNFT
  let memberNftAsMinter: KycdaoNTNFT
  let memberNftAsHolder: KycdaoNTNFT
  let consumer: NTConsumerExample

  let consumerAsHolder: NTConsumerExample

  let deployer: SignerWithAddress
  let minter: SignerWithAddress
  let holder: SignerWithAddress

  let author: Wallet

  let MemberNft: ContractFactory
  let Consumer: ContractFactory

  this.beforeAll(async function () {
    ;[deployer, minter, holder] = await ethers.getSigners()

    const adminAbstract = new ethers.Wallet(testKey)
    const provider = ethers.provider
    author = await adminAbstract.connect(provider)

    //await deployer.sendTransaction({ to: author.address, value: ethers.utils.parseEther('10') })
    MemberNft = await ethers.getContractFactory('KycdaoNTNFT')
    Consumer = await ethers.getContractFactory('NTConsumerExample')
  })

  beforeEach(async function () {
    const memberNftAbstract = await upgrades.deployProxy(MemberNft, ['test', 'TEST', 'metadataURI', 'verificationURI'], {initializer: 'initialize', kind: 'uups'}) as KycdaoNTNFT
    await memberNftAbstract.deployed()
    memberNft = await memberNftAbstract.connect(deployer)
    memberNftAsMinter = await memberNftAbstract.connect(minter)
    memberNftAsHolder = await memberNftAbstract.connect(holder)

    await memberNft.grantRole(minterRole, minter.address)
    await memberNft.grantRole(minterRole, author.address)
    memberNft = await memberNftAbstract.connect(deployer)

    await memberNft.grantRole(minterRole, minter.address)
    await memberNft.grantRole(minterRole, author.address)

    consumer = (await Consumer.deploy(author.address, memberNft.address)) as NTConsumerExample
    consumerAsHolder = await consumer.connect(holder)
  })

  describe('validating', function () {
    // it('verify deployment parameters', async function () {})

    describe('consumer', function () {
      it('Allows holder to access function that requires validation', async function () {
        await memberNft.authorizeMinting(1234, holder.address, "ABC123", "asd")
        await memberNftAsHolder.mint(1234)
        expect(await memberNft.balanceOf(holder.address)).to.equal(1)

        const currBlockTime = await blockTime()

        const expiration = currBlockTime + 1000
        console.log({ currBlockTime, expiration, address: memberNft.address })

        const msgHash = 
          ethers.utils.arrayify(ethers.utils.solidityKeccak256(['address', 'uint256', 'uint256', 'uint256'], [memberNft.address, 1, 1, expiration]))
        const sig = await author.signMessage(msgHash)

        await consumerAsHolder.joinDao(100, 1, 1, expiration, sig)
      })
    })
  })
})
