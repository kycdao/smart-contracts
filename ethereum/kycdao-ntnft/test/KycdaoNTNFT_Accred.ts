// @ts-ignore
import { ethers, upgrades } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { KycdaoNTNFTAccreditation } from '../src/types/contracts/KycdaoNTNFTAccreditation'
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

describe.only('KycdaoNtnft Accreditation Membership', function () {
  let memberNft: KycdaoNTNFTAccreditation
  let memberNftAsMinter: KycdaoNTNFTAccreditation
  let memberNftAsAnyone: KycdaoNTNFTAccreditation

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

    MemberNft = await ethers.getContractFactory('KycdaoNTNFTAccreditation')
  })

  beforeEach(async function () {
    const memberNftAbstract = await upgrades.deployProxy(MemberNft, ['test', 'TEST', 'metadataURI', 'verificationURI'], {initializer: 'initialize', kind: 'uups'}) as KycdaoNTNFTAccreditation
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
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(0)
      })
    })

    describe('mint  with nonce', function () {
      it('Mint a token ', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000        
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
        expect(await memberNft.tokenURI(1), "metadataURI/ABC123")
      })

      it('Updates total supply ', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000        
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.totalSupply()).to.equal(1)
      })

      it('Allows enumeration ', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000        
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.tokenOfOwnerByIndex(anyone.address, 0)).to.equal(1)
        expect(await memberNft.tokenByIndex(0)).to.equal(1)
      })

      it('Fails if mint used twice', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000        
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(memberNftAsAnyone.mint(456)).to.be.revertedWith('Unauthorized code')
      })
    })

    describe('no transfers', function () {
      it('Does not allow tokens to be transferred', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000        
        await memberNftAsMinter.authorizeMinting(123, anyone.address, "ABC123", "uidasd", expiration)
        await memberNftAsAnyone.mint(123)
        expect(memberNftAsAnyone.transferFrom(anyone.address, author.address, 1)).to.be.revertedWith('Not transferable!')
      })
    })
  })

  describe('status', function () {
    describe('checking status for existing token', function () {
      it('Has valid expiry', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.tokenExpiry(tokenId)).to.equal(expiration)
      })

      it('Is not revoked', async function () {
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(false)
      })

      it('Has valid NFT', async function () {
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
        const currBlockTime = await blockTime()
        const expiration = currBlockTime + 1000
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(true)
      })      
    })

    describe('checking status for NON existing token', function () {
      it('Expiry reverts with error', async function () {
        // TODO: Currently fails due to no revert data 
        // expect(await memberNft.tokenExpiry(1)).to.be.revertedWith('Expiry query for nonexistent token')
      })

      it('IsRevoked reverts with error', async function () {
        // TODO: Currently fails due to no revert data
        // expect(await memberNft.tokenIsRevoked(1)).to.be.revertedWith('IsRevoked query for nonexistent token')
      })

      it('Has valid NFT returns false', async function () {
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
      })      
    })    
  })

  describe('updating status', function () {
    it('To new expiry, updates expiry', async function () {
      const currBlockTime = await blockTime()
      const expiration = currBlockTime + 1000
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime + 2000
      await memberNft.updateExpiry(tokenId, newExpiration)
      expect(await memberNft.tokenExpiry(tokenId)).to.equal(newExpiration)
    })

    it('To expiry in the past, updates expiry and invalidates token', async function () {
      const currBlockTime = await blockTime()
      const expiration = currBlockTime + 1000
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime - 1000
      await memberNft.updateExpiry(tokenId, newExpiration)
      expect(await memberNft.tokenExpiry(tokenId)).to.equal(newExpiration)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
    })

    it('By revoking, revokes token', async function () {
      const currBlockTime = await blockTime()
      const expiration = currBlockTime + 1000
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      await memberNft.revokeToken(tokenId)
      expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(true)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
    })

    it('By revoking all, revokes token', async function () {
      const currBlockTime = await blockTime()
      const expiration = currBlockTime + 1000
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      await memberNft.revokeAll(anyone.address)
      expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(true)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
    })     
  })

})
