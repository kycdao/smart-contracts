// @ts-ignore
import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { KycdaoNTNFT } from '../src/types/contracts/KycdaoNTNFT'
import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import { PriceFeed } from '../src/types/contracts/PriceFeed'
import { TestChainlinkPriceFeed } from '../src/types/contracts/test/TestChainlinkPriceFeed'
import { TestBandPriceFeed } from '../src/types/contracts/test/TestBandPriceFeed'
import { Wallet } from '@ethersproject/wallet'
import { ContractFactory } from '@ethersproject/contracts'
import { BigNumber } from 'ethers'

use(solidity)

const expectedVersion = '0.3.1'

const zeroAddress = '0x0000000000000000000000000000000000000000'

const minterRole = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])
const ownerRole = ethers.utils.solidityKeccak256(['string'], ['OWNER_ROLE'])

const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000'

const testKey = '0xdd631135f3a99e4d747d763ab5ead2f2340a69d2a90fab05e20104731365fde3'

const initPriceFeedValChainlink: BigNumber = BigNumber.from(1 * 10 ** 8)
const initPriceFeedValBand: BigNumber = BigNumber.from(1 * 10).pow(18)

enum PriceFeedType { CHAINLINK, BAND }

const testInitArgs = {
  name: 'test', 
  symbol: 'TEST',
  baseURI: 'metadataBaseURI',
  verificationBaseURI: 'verificationURI',
}    

const testMetaUID = 'ABC123'
const testVerifUID = 'uid1234'

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
  let PriceFeedAbstract: ContractFactory
  let TestChainlinkPriceFeedAbstract: ContractFactory
  let TestBandPriceFeedAbstract: ContractFactory

  let initData: string

  let expiration: number
  let expectedMintCost: BigNumber

  let proxyDeployed: ProxyUUPS
  let KycdaoNTNFTDeployed: KycdaoNTNFT

  this.beforeAll(async function () {
    ;[deployer, minter, anyone] = await ethers.getSigners()

    const adminAbstract = new ethers.Wallet(testKey)
    const provider = ethers.provider
    author = await adminAbstract.connect(provider)

    KycdaoNTNFTAbstract = await ethers.getContractFactory('KycdaoNTNFT')
    ProxyAbstract = await ethers.getContractFactory('ProxyUUPS')
    PriceFeedAbstract = await ethers.getContractFactory('PriceFeed')
    TestChainlinkPriceFeedAbstract = await ethers.getContractFactory('TestChainlinkPriceFeed')
    TestBandPriceFeedAbstract = await ethers.getContractFactory('TestBandPriceFeed')
  })

  beforeEach(async function () {
    const ChainlinkPriceFeedDeployed = await TestChainlinkPriceFeedAbstract.deploy(initPriceFeedValChainlink) as PriceFeed
    await ChainlinkPriceFeedDeployed.deployed()

    const PriceFeedDeployed = await PriceFeedAbstract.deploy(ChainlinkPriceFeedDeployed.address, PriceFeedType.CHAINLINK, '', '') as PriceFeed
    await PriceFeedDeployed.deployed()

    KycdaoNTNFTDeployed = await KycdaoNTNFTAbstract.deploy() as KycdaoNTNFT
    await KycdaoNTNFTDeployed.deployed()
    //TODO: We should deploy the proxy via xdeploy to test this properly,
    //      but the Create2DeployerLocal.sol is failing at the moment
    proxyDeployed = await ProxyAbstract.deploy() as ProxyUUPS
    await proxyDeployed.deployed()
    const testArgs = [testInitArgs.name, testInitArgs.symbol, testInitArgs.baseURI, testInitArgs.verificationBaseURI, PriceFeedDeployed.address]
    initData = KycdaoNTNFTAbstract.interface.encodeFunctionData('initialize', testArgs)
    await proxyDeployed.initProxy(KycdaoNTNFTDeployed.address, initData)
    const KycdaoNTNFT = KycdaoNTNFTAbstract.attach(proxyDeployed.address) as KycdaoNTNFT
    memberNft = await KycdaoNTNFT.connect(deployer)
    memberNftAsMinter = await KycdaoNTNFT.connect(minter)
    memberNftAsAnyone = await KycdaoNTNFT.connect(anyone)

    await memberNft.grantRole(minterRole, minter.address)
    await memberNft.grantRole(minterRole, author.address)

    const currBlockTime = await blockTime()
    expiration = currBlockTime + 1000

    expectedMintCost = await memberNft.getMintPriceNative()
  })

  describe('check version', function () {
    it('should return the correct version', async function () {
      expect(await memberNft.version()).to.equal(expectedVersion)
    })
  })

  describe('check proxy', function () {
    it('should have the correct implementation', async function () {
      expect(await proxyDeployed.getImplementation()).to.equal(KycdaoNTNFTDeployed.address)
    })
  })

  describe('authorize minting', function () {
    it('should not allow anyone to auth mint', async function () {
      await expect(memberNftAsAnyone.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('!minter')
    })

    it('should not allow the same code to be used twice', async function () {
      await memberNft.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await expect(memberNft.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('Code already authorized')
    })
  })

  describe('using sendGasOnAuth', function () {
    it('should require an owner to set sendGasOnAuth', async function () {
      await expect(memberNftAsAnyone.setSendGasOnAuthorization(1)).to.be.revertedWith('!owner')
    })

    it('should fail to send gas when contract balance is zero', async function () {
      const sendGasOnAuth = 1000
      await memberNft.setSendGasOnAuthorization(sendGasOnAuth)
      const origBalance = await anyone.getBalance()
      await expect(memberNft.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('Failed to send gas for minting')
    })

    it('should send gas to recipient when sendGasOnAuth is above zero', async function () {
      const sendGasOnAuth = 1000
      await memberNft.setSendGasOnAuthorization(sendGasOnAuth)
      const origBalance = await anyone.getBalance()
      await minter.sendTransaction({ to: memberNft.address, value: sendGasOnAuth })
      await memberNft.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      expect(await ethers.provider.getBalance(anyone.address)).to.equal(origBalance.add(sendGasOnAuth))
    })    
  })

  describe('minting', function () {
    describe('mint  admin', function () {
      it('Authorize minter to mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(0)
      })
    })

    describe('mint  with nonce', function () {
      it('Mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
        expect(await memberNft.tokenURI(1), "metadataURI/ABC123")
      })

      it('Updates total supply ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        expect(await memberNft.totalSupply()).to.equal(1)
      })

      it('Allows enumeration ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        expect(await memberNft.tokenOfOwnerByIndex(anyone.address, 0)).to.equal(1)
        expect(await memberNft.tokenByIndex(0)).to.equal(1)
      })

      it('Fails if mint used twice', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        await expect(memberNftAsAnyone.mint(456)).to.be.revertedWith('Unauthorized code')
      })
    })

    describe('mint with differing payments', function () {
      it('Fails to mint with no payment', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await expect(memberNftAsAnyone.mint(456)).to.be.revertedWith('Insufficient payment for minting')      
      })

      it('Fails to mint with too little payment', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        const lowerPayment = expectedMintCost.sub(100)
        await expect(memberNftAsAnyone.mint(456, {value: lowerPayment})).to.be.revertedWith('Insufficient payment for minting')      
      })

      it('Mints with too much payment', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        const higherPayment = expectedMintCost.add(100)
        await memberNftAsAnyone.mint(456, {value: higherPayment})
        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
      })

      it('Refunds any additional amount above expected payment', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        const higherPayment = expectedMintCost.add(100)
        const initBalance = await anyone.getBalance()
        const tx = await memberNftAsAnyone.mint(456, {value: higherPayment})
        const res = await tx.wait()
        const postBalance = await anyone.getBalance()
        const gasCost = res.gasUsed.mul(res.effectiveGasPrice)

        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
        expect(postBalance).to.equal(initBalance.sub(expectedMintCost).sub(gasCost))
      })

      it('Mints when no payment is expected', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, true)
        await memberNftAsAnyone.mint(456)
        expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
      })      
    })

    describe('no transfers', function () {
      it('Does not allow tokens to be transferred', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        await expect(memberNftAsAnyone.transferFrom(anyone.address, author.address, 1)).to.be.revertedWith('Not transferable!')
      })
    })
  })

  describe('getting metadata from KYCNFTs', function () {
    describe('metadata', function () {
      it('returns the expected tokenURI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        expect(await memberNft.tokenURI(1)).to.equal(testInitArgs.baseURI + testMetaUID)
      })
      
      it('requires the owner to set the base metadata URI', async function () {
        await expect(memberNftAsAnyone.setMetadataBaseURI("newURI")).to.be.revertedWith('!owner')
      })

      it('allows the owner to set the base metadata URI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        await memberNft.setMetadataBaseURI("newURI")
        expect(await memberNft.tokenURI(1)).to.equal("newURI" + testMetaUID)
      })

      it('fails when called with a non-existant tokenId', async function () {
        await expect(memberNft.tokenURI(1)).to.be.revertedWith('ERC721Metadata: URI query for nonexistent token')
      })
    })

    describe('verification metadata', function () {
      it('returns the expected tokenVerificationURI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        expect(await memberNft.tokenVerificationURI(1)).to.equal(testInitArgs.verificationBaseURI + testVerifUID)
      })
      
      it('requires the owner to set the tokenVerificationURI', async function () {
        await expect(memberNftAsAnyone.setVerificationBaseURI("newURI")).to.be.revertedWith('!owner')
      })

      it('allows the owner to set the tokenVerificationURI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        await memberNft.setVerificationBaseURI("newURI")
        expect(await memberNft.tokenVerificationURI(1)).to.equal("newURI" + testVerifUID)
      })

      it('fails when called with a non-existant tokenId', async function () {
        await expect(memberNft.tokenVerificationURI(1)).to.be.revertedWith('ERC721Metadata: URI query for nonexistent token')
      })
    })
  })

  describe('KYCNFT status', function () {
    describe('checking status for existing token', function () {
      it('Has valid expiry', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.tokenExpiry(tokenId)).to.equal(expiration)
      })

      it('Is not revoked', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(false)
      })

      it('Has valid NFT', async function () {
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(true)
      })      
    })

    describe('checking status for NON existing token', function () {
      it('Expiry reverts with error', async function () {
        await expect(memberNft.tokenExpiry(1)).to.be.revertedWith('Expiry query for nonexistent token')
      })

      it('IsRevoked reverts with error', async function () {
        await expect(memberNft.tokenIsRevoked(1)).to.be.revertedWith('IsRevoked query for nonexistent token')
      })

      it('Has valid NFT returns false', async function () {
        expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
      })      
    })    
  })

  describe('updating status', function () {
    it('requires the minter to update the expiry', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      await expect(memberNftAsAnyone.updateExpiry(1, 123)).to.be.revertedWith('!minter')
    })

    it('requires the minter to update the revoked status', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      await expect(memberNftAsAnyone.setRevokeToken(1, true)).to.be.revertedWith('!minter')
    })

    it('fails to update expiry with a non-existant tokenId', async function () {
      await expect(memberNft.updateExpiry(1, 123)).to.be.revertedWith('updateExpiry for nonexistent token')
    })

    it('fails to update revoked status with a non-existant tokenId', async function () {
      await expect(memberNft.setRevokeToken(1, true)).to.be.revertedWith('revokeToken for nonexistent token')
    })

    it('To new expiry, updates expiry', async function () {
      const currBlockTime = await blockTime()
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime + 2000
      await memberNft.updateExpiry(tokenId, newExpiration)
      expect(await memberNft.tokenExpiry(tokenId)).to.equal(newExpiration)
    })

    it('To expiry in the past, updates expiry and invalidates token', async function () {
      const currBlockTime = await blockTime()
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime - 1000
      await memberNft.updateExpiry(tokenId, newExpiration)
      expect(await memberNft.tokenExpiry(tokenId)).to.equal(newExpiration)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
    })

    it('By revoking, revokes token', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const tokenId = await memberNft.tokenOfOwnerByIndex(anyone.address, 0)
      await memberNft.setRevokeToken(tokenId, true)
      expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(true)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(false)
      await memberNft.setRevokeToken(tokenId, false)
      expect(await memberNft.tokenIsRevoked(tokenId)).to.equal(false)
      expect(await memberNft.hasValidToken(anyone.address)).to.equal(true)
    })     
  })

  describe('changing mint cost', function () {
    it('fails when not called by owner', async function () {
      const curMintCost = await memberNft.mintCost()
      const newCost = curMintCost.add(2000)
      await expect(memberNftAsAnyone.setMintCost(newCost)).to.be.revertedWith('!owner')
    })

    it('updates the mint cost', async function () {
      const curMintCost = await memberNft.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNft.setMintCost(newCost)
      expect(await memberNft.mintCost()).to.equal(newCost)
    })

    it('updates the expected native mint cost', async function () {
      const curNativeMintCost = await memberNft.getMintPriceNative()
      const curMintCost = await memberNft.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNft.setMintCost(newCost)
      expect(await memberNft.mintCost()).to.equal(newCost)
      expect(curNativeMintCost.lt(await memberNft.getMintPriceNative())).to.be.true
    })
    
    it('fails minting using original amount after updating to a higher price', async function () {
      const curNativeMintCost = await memberNft.getMintPriceNative()
      const curMintCost = await memberNft.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNft.setMintCost(newCost)
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await expect(memberNftAsAnyone.mint(456, {value: curNativeMintCost})).to.be.revertedWith('Insufficient payment for minting')
    })

    it('mints using new amount after updating to a higher price', async function () {
      const curMintCost = await memberNft.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNft.setMintCost(newCost)
      const newNativeMintCost = await memberNft.getMintPriceNative()      
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: newNativeMintCost})
      expect(await memberNft.balanceOf(anyone.address)).to.equal(1)
    })    
  })

  describe('setting pricefeed', function () {
    it('fails when not called by owner', async function () {
      const chainlinkPriceFeed = await TestChainlinkPriceFeedAbstract.deploy(initPriceFeedValChainlink) as TestChainlinkPriceFeed
      await chainlinkPriceFeed.deployed()
      const priceFeedDeployed = await PriceFeedAbstract.deploy(chainlinkPriceFeed.address, PriceFeedType.CHAINLINK, '', '') as PriceFeed
      await priceFeedDeployed.deployed()      
      await expect(memberNftAsAnyone.setPriceFeed(priceFeedDeployed.address)).to.be.revertedWith('!owner')
    })

    it('fails when invalid PriceFeedType is used', async function () {
      const chainlinkPriceFeed = await TestChainlinkPriceFeedAbstract.deploy(initPriceFeedValChainlink) as TestChainlinkPriceFeed
      await chainlinkPriceFeed.deployed()
      //Should be with 'Invalid PriceFeedType' but somethings wrong with the revert message
      await expect(PriceFeedAbstract.deploy(chainlinkPriceFeed.address, PriceFeedType.CHAINLINK + 10, '', '')).to.be.reverted
    })

    it('sets the price feed to the given address', async function () {
      const newPriceFeedVal = initPriceFeedValChainlink.mul(2)
      const chainlinkPriceFeed = await TestChainlinkPriceFeedAbstract.deploy(newPriceFeedVal) as TestChainlinkPriceFeed
      await chainlinkPriceFeed.deployed()
      const priceFeedDeployed = await PriceFeedAbstract.deploy(chainlinkPriceFeed.address, PriceFeedType.CHAINLINK, '', '') as PriceFeed
      await priceFeedDeployed.deployed()
      await memberNft.setPriceFeed(priceFeedDeployed.address)
      const newNativeMintCost = await memberNft.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })

    it('can use a BAND price feed', async function () {
      const newPriceFeedVal = initPriceFeedValBand.mul(2)
      const bandPriceFeed = await TestBandPriceFeedAbstract.deploy(newPriceFeedVal) as TestBandPriceFeed
      await bandPriceFeed.deployed()
      const priceFeedDeployed = await PriceFeedAbstract.deploy(bandPriceFeed.address, PriceFeedType.BAND, 'CELO', 'USD') as PriceFeed
      await priceFeedDeployed.deployed()
      await memberNft.setPriceFeed(priceFeedDeployed.address)
      const newNativeMintCost = await memberNft.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })
    
    it('we can change the price feed to CHAINLINK feed', async function () {
      const newPriceFeedVal = initPriceFeedValChainlink.mul(2)
      const chainlinkPriceFeed = await TestChainlinkPriceFeedAbstract.deploy(newPriceFeedVal) as TestChainlinkPriceFeed
      await chainlinkPriceFeed.deployed()
      const priceFeedDeployed = PriceFeedAbstract.attach(await memberNft.nativeUSDPriceFeed()) as PriceFeed
      await priceFeedDeployed.setPriceFeedChainlink(chainlinkPriceFeed.address)
      const newNativeMintCost = await memberNft.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })

    it('we can change the price feed to BAND feed', async function () {
      const newPriceFeedVal = initPriceFeedValBand.mul(2)
      const bandPriceFeed = await TestBandPriceFeedAbstract.deploy(newPriceFeedVal) as TestBandPriceFeed
      await bandPriceFeed.deployed()
      const priceFeedDeployed = PriceFeedAbstract.attach(await memberNft.nativeUSDPriceFeed()) as PriceFeed
      await priceFeedDeployed.setPriceFeedBand(bandPriceFeed.address, 'CELO', 'USD')
      const newNativeMintCost = await memberNft.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })
  })

  describe('retrieving payments from contract', function () {
    it('sends balance to an address given', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const initialBal = await ethers.provider.getBalance(anyone.address)
      await memberNft.sendBalanceTo(anyone.address)
      const finalBal = await ethers.provider.getBalance(anyone.address)
      expect(finalBal).to.equal(initialBal.add(expectedMintCost))
    })

    it('fails when not called by owner', async function () {
      await expect(memberNftAsAnyone.sendBalanceTo(anyone.address)).to.be.revertedWith('!owner')
    })
    
  })

})
