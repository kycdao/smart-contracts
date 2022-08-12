let { ethers, network, upgrades } = require('hardhat')

if (network.name != "localhost") {
    console.log("Skipping GSN tests when not on localhost")
    return
}

let web3 = require( 'web3')
let { RelayProvider } = require('@opengsn/provider')
let { GsnTestEnvironment } = require('@opengsn/dev')
let { solidity } = require('ethereum-waffle')
let { use, expect } = require('chai')
const { EtherscanProvider } = require('@ethersproject/providers')
const { assert } = require('console')

use(solidity)

const minterRole = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])

async function blockTime() {
  const block = await ethers.provider.getBlock('latest')
  return block.timestamp
}

describe.only('KycdaoNtnft Membership with GSN', function () {
    let memberNft
    let memberNftAsMinter
  
    let deployer
    let minter
  
    let KycdaoNTNFTAbstract
    let PriceFeedAbstract
    let ProxyAbstract
  
    let gsnAcct
    let memberNftAsGSN

    let expiration

    this.beforeAll(async function () {
      ;[deployer, minter] = await ethers.getSigners()
      KycdaoNTNFTAbstract = await ethers.getContractFactory('KycdaoNTNFT')
      PriceFeedAbstract = await ethers.getContractFactory('TestPriceFeed')
      ProxyAbstract = await ethers.getContractFactory('ProxyUUPS')
    })

    beforeEach(async function () {
        const PriceFeedDeployed = await PriceFeedAbstract.deploy()
        await PriceFeedDeployed.deployed()
    
        const KycdaoNTNFTDeployed = await KycdaoNTNFTAbstract.deploy()
        await KycdaoNTNFTDeployed.deployed()
        //TODO: We should deploy the proxy via xdeploy to test this properly,
        //      but the Create2DeployerLocal.sol is failing at the moment
        const proxyDeployed = await ProxyAbstract.deploy()
        await proxyDeployed.deployed()
        initData = KycdaoNTNFTAbstract.interface.encodeFunctionData('initialize', ['test', 'TEST', 'metadataURI', 'verificationURI', PriceFeedDeployed.address])
        await proxyDeployed.initProxy(KycdaoNTNFTDeployed.address, initData)

        const KycdaoNTNFT = KycdaoNTNFTAbstract.attach(proxyDeployed.address)
        memberNft = await KycdaoNTNFT.connect(deployer)
        memberNftAsMinter = await KycdaoNTNFT.connect(minter)    
        await memberNft.grantRole(minterRole, minter.address)

        const currBlockTime = await blockTime()
        expiration = currBlockTime + 1000

        // Gsn specific init
        let env = await GsnTestEnvironment.startGsn('localhost')
        const { forwarderAddress, paymasterAddress } = env.contractsDeployment
        const web3provider = new web3.providers.HttpProvider('http://localhost:8545')
        let gsnWrapper = RelayProvider.newProvider({provider: web3provider, config: { paymasterAddress: paymasterAddress}})
        gsnWrapper = await gsnWrapper.init()
        await memberNft.setTrustedForwarder(forwarderAddress)
        let gsnProvider = new ethers.providers.Web3Provider(gsnWrapper)
        gsnAcct = gsnProvider.provider.newAccount()
        let gsnSigner = gsnProvider.getSigner(gsnAcct.address, gsnAcct.privateKey)
        memberNftAsGSN = await KycdaoNTNFT.connect(gsnSigner)
    })

    describe('mint using GSN', function () {
        it('Allows minting from an address with no eth when payment is skipped', async function () {
            expect(await ethers.provider.getBalance(gsnAcct.address)).to.equal(0)
            await memberNftAsMinter.authorizeMinting(456, gsnAcct.address, "ABC123", "uid1234", expiration, true)
            await memberNftAsGSN.mint(456)
            expect(await memberNft.balanceOf(gsnAcct.address)).to.equal(1)
            expect(await memberNft.tokenURI(1), "metadataURI/ABC123")
        })

        it('Fails minting when payment is required via GSN', async function () {
            expect(await ethers.provider.getBalance(gsnAcct.address)).to.equal(0)
            const expectedMintCost = await memberNft.getMintPriceNative()
            await deployer.sendTransaction({
                to: gsnAcct.address,
                value: expectedMintCost
            })
            expect(await ethers.provider.getBalance(gsnAcct.address)).to.equal(expectedMintCost)
            await memberNftAsMinter.authorizeMinting(456, gsnAcct.address, "ABC123", "uid1234", expiration, false)

            // GSN thinks this won't revert so we need special handling to detect this tx failure
            const tx = await memberNftAsGSN.mint(456, {value: expectedMintCost})
            try {
                await tx.wait()
                assert.fail("Transaction should have errored")
            } catch (err) {
                // We don't actually get the revert message though unfortunately...
                expect(err.message).to.contain('transaction failed')
            }            
            expect(await ethers.provider.getBalance(gsnAcct.address)).to.equal(expectedMintCost)
            expect(await memberNft.balanceOf(gsnAcct.address)).to.equal(0)
        })        
    })
})