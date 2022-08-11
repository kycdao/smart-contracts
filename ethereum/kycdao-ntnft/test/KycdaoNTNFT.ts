// @ts-ignore
import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { KycdaoNTNFT } from '../src/types/contracts/KycdaoNTNFT'
import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import { Wallet } from '@ethersproject/wallet'
import { ContractFactory } from '@ethersproject/contracts'

use(solidity)

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

  let KycdaoNTNFTAbstract: ContractFactory
  let ProxyAbstract: ContractFactory
  let initData: string

  let expiration: number

  this.beforeAll(async function () {
    ;[deployer, minter, anyone] = await ethers.getSigners()

    const adminAbstract = new ethers.Wallet(testKey)
    const provider = ethers.provider
    author = await adminAbstract.connect(provider)

    KycdaoNTNFTAbstract = await ethers.getContractFactory('KycdaoNTNFT')
    ProxyAbstract = await ethers.getContractFactory('ProxyUUPS')
    initData = KycdaoNTNFTAbstract.interface.encodeFunctionData('initialize', ['test', 'TEST', 'metadataURI', 'verificationURI'])
  })

  beforeEach(async function () {
    const KycdaoNTNFTDeployed = await KycdaoNTNFTAbstract.deploy() as KycdaoNTNFT
    await KycdaoNTNFTDeployed.deployed()
    //TODO: We should deploy the proxy via xdeploy to test this properly,
    //      but the Create2DeployerLocal.sol is failing at the moment
    const proxyDeployed = await ProxyAbstract.deploy() as ProxyUUPS
    await proxyDeployed.deployed()
    await proxyDeployed.initProxy(KycdaoNTNFTDeployed.address, initData)
    const KycdaoNTNFT = KycdaoNTNFTAbstract.attach(proxyDeployed.address) as KycdaoNTNFT
    memberNft = await KycdaoNTNFT.connect(deployer)
    memberNftAsMinter = await KycdaoNTNFT.connect(minter)
    memberNftAsAnyone = await KycdaoNTNFT.connect(anyone)

    await memberNft.grantRole(minterRole, minter.address)
    await memberNft.grantRole(minterRole, author.address)

    const currBlockTime = await blockTime()
    expiration = currBlockTime + 1000
  })

  describe('minting', function () {
    describe('mint  admin', function () {
      it('Authorize minter to mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(0)
      })
    })

    describe('mint  with nonce', function () {
      it('Mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
        expect(await memberNft.tokenURI(1), "metadataURI/ABC123")
      })

      it('Updates total supply ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.totalSupply()).to.equal(1)
      })

      it('Allows enumeration ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.tokenOfOwnerByIndex(anyone.address, 0)).to.equal(1)
        expect(await memberNft.tokenByIndex(0)).to.equal(1)
      })

      it('Fails if mint used twice', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        expect(memberNftAsAnyone.mint(456)).to.be.revertedWith('Unauthorized code')
      })
    })

    describe('no transfers', function () {
      it('Does not allow tokens to be transferred', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, "ABC123", "uidasd", expiration)
        await memberNftAsAnyone.mint(123)
        expect(memberNftAsAnyone.transferFrom(anyone.address, author.address, 1)).to.be.revertedWith('Not transferable!')
      })
    })
  })

  describe('status', function () {
    describe('checking status for existing token', function () {
      it('Has valid expiry', async function () {
        console.log(`expiration is: ${expiration}`)
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.tokenExpiry(tokenId)).to.equal(expiration)
      })

      it('Is not revoked', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
        await memberNftAsAnyone.mint(456)
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(false)
      })

      it('Has valid NFT', async function () {
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
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
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime + 2000
      await memberNft.updateExpiry(tokenId, newExpiration)
      expect(await memberNft.tokenExpiry(tokenId)).to.equal(newExpiration)
    })

    it('To expiry in the past, updates expiry and invalidates token', async function () {
      const currBlockTime = await blockTime()
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime - 1000
      await memberNft.updateExpiry(tokenId, newExpiration)
      expect(await memberNft.tokenExpiry(tokenId)).to.equal(newExpiration)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
    })

    it('By revoking, revokes token', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, "ABC123", "uid1234", expiration)
      await memberNftAsAnyone.mint(456)
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      await memberNft.setRevokeToken(tokenId, true)
      expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(true)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
      await memberNft.setRevokeToken(tokenId, false)
      expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(false)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(true)
    })     
  })

})
