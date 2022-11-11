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
import { ContractFactory } from '@ethersproject/contracts'
import { BigNumber } from 'ethers'

use(solidity)

const expectedVersion = '0.3.1'

const zeroAddress = '0x0000000000000000000000000000000000000000'

const minterRole = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])
const ownerRole = ethers.utils.solidityKeccak256(['string'], ['OWNER_ROLE'])
const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000'

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
  let memberNftAsDeployer: KycdaoNTNFT
  let memberNftAsOwner: KycdaoNTNFT
  let memberNftAsMinter: KycdaoNTNFT
  let memberNftAsAnyone: KycdaoNTNFT

  let deployer: SignerWithAddress
  let owner: SignerWithAddress
  let minter: SignerWithAddress
  let anyone: SignerWithAddress
  let receiver: SignerWithAddress

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
  let KycdaoNTNFTAtProxy: KycdaoNTNFT

  this.beforeAll(async function () {
    ;[deployer, owner, minter, anyone, receiver] = await ethers.getSigners()

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
    KycdaoNTNFTAtProxy = KycdaoNTNFTAbstract.attach(proxyDeployed.address) as KycdaoNTNFT
    memberNftAsDeployer = await KycdaoNTNFTAtProxy.connect(deployer)
    memberNftAsOwner = await KycdaoNTNFTAtProxy.connect(owner)
    memberNftAsMinter = await KycdaoNTNFTAtProxy.connect(minter)
    memberNftAsAnyone = await KycdaoNTNFTAtProxy.connect(anyone)

    await memberNftAsDeployer.grantRole(minterRole, minter.address)
    await memberNftAsDeployer.grantRole(ownerRole, owner.address)

    const currBlockTime = await blockTime()
    expiration = currBlockTime + 1000

    expectedMintCost = await memberNftAsAnyone.getMintPriceNative()
  })

  describe('check version', function () {
    it('should return the correct version', async function () {
      expect(await memberNftAsAnyone.version()).to.equal(expectedVersion)
    })
  })

  describe('check proxy', function () {
    it('should have the correct implementation', async function () {
      expect(await proxyDeployed.getImplementation()).to.equal(KycdaoNTNFTDeployed.address)
    })

    it('should require the owner to upgrade', async function () {
      await expect(memberNftAsMinter.upgradeTo(zeroAddress)).to.be.revertedWith('!owner')
    })

    it('should prevent upgrades to addresses with no contract', async function () {
      await expect(memberNftAsOwner.upgradeTo(zeroAddress)).to.be.revertedWith('function call to a non-contract account')
    })

    it('should allow the owner to upgrade', async function () {
      const newKYCDeploy = await KycdaoNTNFTAbstract.deploy() as KycdaoNTNFT
      await newKYCDeploy.deployed()  
      await expect(memberNftAsOwner.upgradeTo(newKYCDeploy.address)).to.emit(proxyDeployed, 'Upgraded').withArgs(newKYCDeploy.address)
      expect(await proxyDeployed.getImplementation()).to.equal(newKYCDeploy.address)      
    })
  })

  //TODO: Add more dynamic interface checking here
  //like: https://ethereum.stackexchange.com/questions/113329/is-there-a-way-to-get-an-interface-id-of-a-solidity-interface-using-ethersjs
  describe('supports interface', function () {
    it('should support ERC165', async function () {
      expect(await memberNftAsAnyone.supportsInterface('0x01ffc9a7')).to.be.true
    })

    it('should support ERC721', async function () {
      expect(await memberNftAsAnyone.supportsInterface('0x80ac58cd')).to.be.true
    })

    it('should support ERC721Metadata', async function () {
      expect(await memberNftAsAnyone.supportsInterface('0x5b5e139f')).to.be.true
    })

    it('should support ERC721Enumerable', async function () {
      expect(await memberNftAsAnyone.supportsInterface('0x780e9d63')).to.be.true
    })

    it('should fail for invalid interface', async function () {
      expect(await memberNftAsAnyone.supportsInterface('0x12345678')).to.be.false
    })
  })

  describe('authorize minting', function () {
    it('should not allow anyone to auth mint', async function () {
      await expect(memberNftAsAnyone.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('!minter')
    })

    it('should not allow the same code to be used twice', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await expect(memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('Code already authorized')
    })
  })

  describe('using sendGasOnAuth', function () {
    it('should require an owner to set sendGasOnAuth', async function () {
      await expect(memberNftAsAnyone.setSendGasOnAuthorization(1)).to.be.revertedWith('!owner')
    })

    it('should fail to send gas when contract balance is zero', async function () {
      const sendGasOnAuth = 1000
      await memberNftAsOwner.setSendGasOnAuthorization(sendGasOnAuth)
      const origBalance = await anyone.getBalance()
      await expect(memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('Failed to send gas for minting')
    })

    it('should send gas to recipient when sendGasOnAuth is above zero', async function () {
      const sendGasOnAuth = 1000
      await memberNftAsOwner.setSendGasOnAuthorization(sendGasOnAuth)
      const origBalance = await anyone.getBalance()
      await minter.sendTransaction({ to: KycdaoNTNFTAtProxy.address, value: sendGasOnAuth })
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      expect(await ethers.provider.getBalance(anyone.address)).to.equal(origBalance.add(sendGasOnAuth))
    })    
  })

  describe('minting', function () {
    describe('mint  admin', function () {
      it('Authorize minter to mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        expect(await memberNftAsAnyone.balanceOf(anyone.address)).to.equal(0)
      })
    })

    describe('mint with nonce', function () {
      it('Mint a token ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        expect(await memberNftAsAnyone.balanceOf(anyone.address)).to.equal(1)
        expect(await memberNftAsAnyone.tokenURI(1), "metadataURI/ABC123")
      })

      it('Updates total supply ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        expect(await memberNftAsAnyone.totalSupply()).to.equal(1)
      })

      it('Allows enumeration ', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        expect(await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)).to.equal(1)
        expect(await memberNftAsAnyone.tokenByIndex(0)).to.equal(1)
      })

      it('Fails if mint used twice', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        await expect(memberNftAsAnyone.mint(456)).to.be.revertedWith('Unauthorized code')
      })

      it('Fails if mint call is not made by recipient', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await expect(memberNftAsMinter.mint(456)).to.be.revertedWith('Unauthorized code')
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
        expect(await memberNftAsAnyone.balanceOf(anyone.address)).to.equal(1)
      })

      it('Refunds any additional amount above expected payment', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        const higherPayment = expectedMintCost.add(100)
        const initBalance = await anyone.getBalance()
        const tx = await memberNftAsAnyone.mint(456, {value: higherPayment})
        const res = await tx.wait()
        const postBalance = await anyone.getBalance()
        const gasCost = res.gasUsed.mul(res.effectiveGasPrice)

        expect(await memberNftAsAnyone.balanceOf(anyone.address)).to.equal(1)
        expect(postBalance).to.equal(initBalance.sub(expectedMintCost).sub(gasCost))
      })

      it('Mints when no payment is expected', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, true)
        await memberNftAsAnyone.mint(456)
        expect(await memberNftAsAnyone.balanceOf(anyone.address)).to.equal(1)
      })      
    })

    describe('no transfers', function () {
      it('Does not allow tokens to be transferred', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        await expect(memberNftAsAnyone.transferFrom(anyone.address, receiver.address, 1)).to.be.revertedWith('Not transferable!')
      })
    })

    // TODO: Could probably extend this section to a whole bunch of different contracts
    describe('receiver is contract', function () {
      it('Fails to mint to contract without onERC721Received', async function () {
        const NoRespTestWalletAbstract = await ethers.getContractFactory('NoRespTestWallet')
        const receiverContract = await NoRespTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost})).to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer')
      })

      it('Fails if receiver is a contract which reverts onERC721Received', async function () {
        const RevertTestWalletAbstract = await ethers.getContractFactory('RevertTestWallet')
        const receiverContract = await RevertTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost})).to.be.revertedWith('RevertTestWallet')
      })

      it('Fails if receiver is a contract which accepts onERC721Received but returns the wrong selector', async function () {
        const InvalidRespTestWalletAbstract = await ethers.getContractFactory('InvalidRespTestWallet')
        const receiverContract = await InvalidRespTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost})).to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer')
      })

      it('Succeeds if receiver is a contract which accepts onERC721Received and does not require mint payment', async function () {
        const EventTestWalletAbstract = await ethers.getContractFactory('EventTestWallet')
        const receiverContract = await EventTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, true)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123)).to.emit(receiverContract, 'Received')
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(1)
      })

      it('Succeeds if receiver is a contract which accepts onERC721Received and emits an event on mint', async function () {
        const EventTestWalletAbstract = await ethers.getContractFactory('EventTestWallet')
        const receiverContract = await EventTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost})).to.emit(receiverContract, 'Received')
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(1)
      })
      
      it('Fails if receiver is a contract which reverts on receiving a refund', async function () {
        const RevertReceiveTestWalletAbstract = await ethers.getContractFactory('RevertReceiveTestWallet')
        const receiverContract = await RevertReceiveTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost.add(100)})).to.be.revertedWith('Refund failed')
      })

      it('Succeeds if receiver is a contract which accepts a refund and emits an event', async function () {
        const EventReceiveTestWallettAbstract = await ethers.getContractFactory('EventReceiveTestWallet')
        const receiverContract = await EventReceiveTestWallettAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost.add(100)})).to.emit(receiverContract, 'ReceivedRefund')
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(1)
        expect(await ethers.provider.getBalance(receiverContract.address)).to.equal(100)
        expect(await ethers.provider.getBalance(KycdaoNTNFTAtProxy.address)).to.equal(expectedMintCost)
      })

      it('Fails if receiver is a contract which attempts to reenter mint on receiving refund', async function () {
        const ReenterReceiveTestWalletAbstract = await ethers.getContractFactory('ReenterReceiveTestWallet')
        const receiverContract = await ReenterReceiveTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost.mul(10)})).to.be.revertedWith('Refund failed')
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(0)
      })

      it('Fails if receiver is a contract which attempts to reenter mint on onERC721Received', async function () {
        const ReenterTestWalletAbstract = await ethers.getContractFactory('ReenterTestWallet')
        const receiverContract = await ReenterTestWalletAbstract.deploy()
        await memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, true)
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123)).to.be.revertedWith('Unauthorized code')
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(0)
      })
      
      it('Fails if receiver is a contract which attempts to reenter on authorizeMinting', async function () {
        const sendGasOnAuth = 100000
        await memberNftAsOwner.setSendGasOnAuthorization(sendGasOnAuth)
        const ReenterAuthorizeTestWalletAbstract = await ethers.getContractFactory('ReenterAuthorizeTestWallet')
        const receiverContract = await ReenterAuthorizeTestWalletAbstract.deploy()
        await expect(memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)).to.be.revertedWith('Failed to send gas')
        await expect(receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost})).to.be.revertedWith('Unauthorized code')
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(0)
      })

      it('Succeeds if receiver is a contract and send gas on auth is enabled', async function () {
        const sendGasOnAuth = 100000
        await memberNftAsOwner.setSendGasOnAuthorization(sendGasOnAuth)
        await minter.sendTransaction({ to: KycdaoNTNFTAtProxy.address, value: sendGasOnAuth })
        const EventReceiveTestWallettAbstract = await ethers.getContractFactory('EventReceiveTestWallet')
        const receiverContract = await EventReceiveTestWallettAbstract.deploy()
        await expect(memberNftAsMinter.authorizeMinting(123, receiverContract.address, testMetaUID, testVerifUID, expiration, false)).to.emit(receiverContract, 'ReceivedRefund')
        expect(await ethers.provider.getBalance(receiverContract.address)).to.equal(sendGasOnAuth)
        await receiverContract.mint(KycdaoNTNFTAtProxy.address, 123, {value: expectedMintCost})
        expect(await memberNftAsAnyone.balanceOf(receiverContract.address)).to.equal(1)
      })
    })
  })

  describe('getting metadata from KYCNFTs', function () {
    describe('metadata', function () {
      it('returns the expected tokenURI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        expect(await memberNftAsAnyone.tokenURI(1)).to.equal(testInitArgs.baseURI + testMetaUID)
      })
      
      it('requires the owner to set the base metadata URI', async function () {
        await expect(memberNftAsAnyone.setMetadataBaseURI("newURI")).to.be.revertedWith('!owner')
      })

      it('allows the owner to set the base metadata URI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        await memberNftAsOwner.setMetadataBaseURI("newURI")
        expect(await memberNftAsAnyone.tokenURI(1)).to.equal("newURI" + testMetaUID)
      })

      it('fails when called with a non-existant tokenId', async function () {
        await expect(memberNftAsAnyone.tokenURI(1)).to.be.revertedWith('ERC721Metadata: URI query for nonexistent token')
      })
    })

    describe('verification metadata', function () {
      it('returns the expected tokenVerificationURI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        expect(await memberNftAsAnyone.tokenVerificationURI(1)).to.equal(testInitArgs.verificationBaseURI + testVerifUID)
      })
      
      it('requires the owner to set the tokenVerificationURI', async function () {
        await expect(memberNftAsAnyone.setVerificationBaseURI("newURI")).to.be.revertedWith('!owner')
      })

      it('allows the owner to set the tokenVerificationURI', async function () {
        await memberNftAsMinter.authorizeMinting(123, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(123, {value: expectedMintCost})
        await memberNftAsOwner.setVerificationBaseURI("newURI")
        expect(await memberNftAsAnyone.tokenVerificationURI(1)).to.equal("newURI" + testVerifUID)
      })

      it('fails when called with a non-existant tokenId', async function () {
        await expect(memberNftAsAnyone.tokenVerificationURI(1)).to.be.revertedWith('ERC721Metadata: URI query for nonexistent token')
      })
    })
  })

  describe('KYCNFT status', function () {
    describe('checking status for existing token', function () {
      it('Has valid expiry', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        const tokenId = await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNftAsAnyone.tokenExpiry(tokenId)).to.equal(expiration)
      })

      it('Is not revoked', async function () {
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        const tokenId = await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNftAsAnyone.tokenIsRevoked(tokenId)).to.equal(false)
      })

      it('Has valid NFT', async function () {
        expect(await memberNftAsAnyone.hasValidToken(anyone.address)).to.equal(false)
        await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
        await memberNftAsAnyone.mint(456, {value: expectedMintCost})
        const tokenId = await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)
        expect(await memberNftAsAnyone.hasValidToken(anyone.address)).to.equal(true)
      })      
    })

    describe('checking status for NON existing token', function () {
      it('Expiry reverts with error', async function () {
        await expect(memberNftAsAnyone.tokenExpiry(1)).to.be.revertedWith('Expiry query for nonexistent token')
      })

      it('IsRevoked reverts with error', async function () {
        await expect(memberNftAsAnyone.tokenIsRevoked(1)).to.be.revertedWith('IsRevoked query for nonexistent token')
      })

      it('Has valid NFT returns false', async function () {
        expect(await memberNftAsAnyone.hasValidToken(anyone.address)).to.equal(false)
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
      await expect(memberNftAsMinter.updateExpiry(1, 123)).to.be.revertedWith('updateExpiry for nonexistent token')
    })

    it('fails to update revoked status with a non-existant tokenId', async function () {
      await expect(memberNftAsMinter.setRevokeToken(1, true)).to.be.revertedWith('revokeToken for nonexistent token')
    })

    it('To new expiry, updates expiry', async function () {
      const currBlockTime = await blockTime()
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const tokenId = await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime + 2000
      await memberNftAsMinter.updateExpiry(tokenId, newExpiration)
      expect(await memberNftAsAnyone.tokenExpiry(tokenId)).to.equal(newExpiration)
    })

    it('To expiry in the past, updates expiry and invalidates token', async function () {
      const currBlockTime = await blockTime()
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const tokenId = await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)
      const newExpiration = currBlockTime - 1000
      await memberNftAsMinter.updateExpiry(tokenId, newExpiration)
      expect(await memberNftAsAnyone.tokenExpiry(tokenId)).to.equal(newExpiration)
      expect(await memberNftAsAnyone.hasValidToken(anyone.address)).to.equal(false)
    })

    it('By revoking, revokes token', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const tokenId = await memberNftAsAnyone.tokenOfOwnerByIndex(anyone.address, 0)
      await memberNftAsMinter.setRevokeToken(tokenId, true)
      expect(await memberNftAsAnyone.tokenIsRevoked(tokenId)).to.equal(true)
      expect(await memberNftAsAnyone.hasValidToken(anyone.address)).to.equal(false)
      await memberNftAsMinter.setRevokeToken(tokenId, false)
      expect(await memberNftAsAnyone.tokenIsRevoked(tokenId)).to.equal(false)
      expect(await memberNftAsAnyone.hasValidToken(anyone.address)).to.equal(true)
    })     
  })

  describe('changing mint cost', function () {
    it('fails when not called by owner', async function () {
      const curMintCost = await memberNftAsAnyone.mintCost()
      const newCost = curMintCost.add(2000)
      await expect(memberNftAsAnyone.setMintCost(newCost)).to.be.revertedWith('!owner')
    })

    it('updates the mint cost', async function () {
      const curMintCost = await memberNftAsAnyone.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNftAsOwner.setMintCost(newCost)
      expect(await memberNftAsAnyone.mintCost()).to.equal(newCost)
    })

    it('updates the expected native mint cost', async function () {
      const curNativeMintCost = await memberNftAsAnyone.getMintPriceNative()
      const curMintCost = await memberNftAsAnyone.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNftAsOwner.setMintCost(newCost)
      expect(await memberNftAsAnyone.mintCost()).to.equal(newCost)
      expect(curNativeMintCost.lt(await memberNftAsAnyone.getMintPriceNative())).to.be.true
    })
    
    it('fails minting using original amount after updating to a higher price', async function () {
      const curNativeMintCost = await memberNftAsAnyone.getMintPriceNative()
      const curMintCost = await memberNftAsAnyone.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNftAsOwner.setMintCost(newCost)
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await expect(memberNftAsAnyone.mint(456, {value: curNativeMintCost})).to.be.revertedWith('Insufficient payment for minting')
    })

    it('mints using new amount after updating to a higher price', async function () {
      const curMintCost = await memberNftAsAnyone.mintCost()
      const newCost = curMintCost.add(2000)
      await memberNftAsOwner.setMintCost(newCost)
      const newNativeMintCost = await memberNftAsAnyone.getMintPriceNative()      
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: newNativeMintCost})
      expect(await memberNftAsAnyone.balanceOf(anyone.address)).to.equal(1)
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
      await memberNftAsOwner.setPriceFeed(priceFeedDeployed.address)
      const newNativeMintCost = await memberNftAsAnyone.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })

    it('can use a BAND price feed', async function () {
      const newPriceFeedVal = initPriceFeedValBand.mul(2)
      const bandPriceFeed = await TestBandPriceFeedAbstract.deploy(newPriceFeedVal) as TestBandPriceFeed
      await bandPriceFeed.deployed()
      const priceFeedDeployed = await PriceFeedAbstract.deploy(bandPriceFeed.address, PriceFeedType.BAND, 'CELO', 'USD') as PriceFeed
      await priceFeedDeployed.deployed()
      await memberNftAsOwner.setPriceFeed(priceFeedDeployed.address)
      const newNativeMintCost = await memberNftAsAnyone.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })
    
    it('we can change the price feed to CHAINLINK feed', async function () {
      const newPriceFeedVal = initPriceFeedValChainlink.mul(2)
      const chainlinkPriceFeed = await TestChainlinkPriceFeedAbstract.deploy(newPriceFeedVal) as TestChainlinkPriceFeed
      await chainlinkPriceFeed.deployed()
      const priceFeedDeployed = PriceFeedAbstract.attach(await memberNftAsAnyone.nativeUSDPriceFeed()) as PriceFeed
      await priceFeedDeployed.setPriceFeedChainlink(chainlinkPriceFeed.address)
      const newNativeMintCost = await memberNftAsAnyone.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })

    it('we can change the price feed to BAND feed', async function () {
      const newPriceFeedVal = initPriceFeedValBand.mul(2)
      const bandPriceFeed = await TestBandPriceFeedAbstract.deploy(newPriceFeedVal) as TestBandPriceFeed
      await bandPriceFeed.deployed()
      const priceFeedDeployed = PriceFeedAbstract.attach(await memberNftAsAnyone.nativeUSDPriceFeed()) as PriceFeed
      await priceFeedDeployed.setPriceFeedBand(bandPriceFeed.address, 'CELO', 'USD')
      const newNativeMintCost = await memberNftAsAnyone.getMintPriceNative()
      expect(newNativeMintCost).to.equal(expectedMintCost.mul(2))
    })
  })

  describe('setting trusted forwarder', function () {
    it('fails when not called by owner', async function () {
      await expect(memberNftAsAnyone.setTrustedForwarder(anyone.address)).to.be.revertedWith('!owner')
    })

    it('sets the trusted forwarder to the given address', async function () {
      await memberNftAsOwner.setTrustedForwarder(anyone.address)
      expect(await memberNftAsAnyone.trustedForwarder()).to.equal(anyone.address)
    })
  })

  describe('retrieving payments from contract', function () {
    it('sends balance to an address given', async function () {
      await memberNftAsMinter.authorizeMinting(456, anyone.address, testMetaUID, testVerifUID, expiration, false)
      await memberNftAsAnyone.mint(456, {value: expectedMintCost})
      const initialBal = await ethers.provider.getBalance(anyone.address)
      await memberNftAsOwner.sendBalanceTo(anyone.address)
      const finalBal = await ethers.provider.getBalance(anyone.address)
      expect(finalBal).to.equal(initialBal.add(expectedMintCost))
    })

    it('fails when not called by owner', async function () {
      await expect(memberNftAsAnyone.sendBalanceTo(anyone.address)).to.be.revertedWith('!owner')
    })
    
  })

})
