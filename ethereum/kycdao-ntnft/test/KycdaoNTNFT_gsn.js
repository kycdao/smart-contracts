let { ethers, network } = require('hardhat')

if (network.name != "localhost") {
    console.log("Skipping GSN tests when not on localhost")
    return
}

let web3 = require( 'web3')
let { RelayProvider } = require('@opengsn/provider')
let { GsnTestEnvironment } = require('@opengsn/dev')
let { solidity } = require('ethereum-waffle')
let { use, expect } = require('chai')

use(solidity)

const minterRole = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])

describe.only('KycdaoNtnft Membership with GSN', function () {
    let memberNft
    let memberNftAsMinter
  
    let deployer
    let minter
  
    let MemberNft
  
    let gsnAcct
    let memberNftAsGSN

    this.beforeAll(async function () {
      ;[deployer, minter] = await ethers.getSigners()
      MemberNft = await ethers.getContractFactory('KycdaoNTNFT')
    })

    beforeEach(async function () {
        const memberNftAbstract = await MemberNft.deploy('test', 'TEST', 'metadataURI', 'verificationURI')
        memberNft = await memberNftAbstract.connect(deployer)
        memberNftAsMinter = await memberNftAbstract.connect(minter)    
        await memberNft.grantRole(minterRole, minter.address)

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
        memberNftAsGSN = await memberNftAbstract.connect(gsnSigner)
    })

    describe('mint using GSN', function () {
        it('Allows minting from an address with no eth', async function () {
            expect(await ethers.provider.getBalance(gsnAcct.address)).to.equal(0)
            await memberNftAsMinter.authorizeMinting(456, gsnAcct.address, "ABC123", "uid1234")
            await memberNftAsGSN.mint(456)
            expect(await memberNft.balanceOf(gsnAcct.address)).to.equal(1)
            expect(await memberNft.tokenURI(1), "metadataURI/ABC123")
        })
    })
})