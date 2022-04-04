// A script to load some commonly used env into hardhat console
// contains some example transactions you might want to execute too
let web3 = require("web3")
let Gsn = require("@opengsn/provider")

// TODO: Get this from a deployments folder which is filled out by deploy.ts
const contractAddress = "0x761EaeEa482Dd834B5FAB4888c8a3323e10E61aD"
const network = "mumbai"

const nftArtifact = await artifacts.readArtifact('KycdaoNTNFT')

// Roles list
// By default, whoever deploys the account has ADMIN, MINTER and OWNER roles
// MINTER can run authorizeMinting
// OWNER can run setBaseURI
const minterRole = ethers.utils.solidityKeccak256(["string"], ["MINTER_ROLE"])
const ownerRole = ethers.utils.solidityKeccak256(["string"], ["OWNER_ROLE"])

// This is the first 3 accounts within the mnemonic (taken from mnemonic.txt)
// feel free to change var names to suit what these accounts represent for you when using
let signers = await ethers.getSigners()
let deployer = signers[0]
let minter = signers[1]
let anyone = signers[2]

const nftAsDeployer = new ethers.Contract(contractAddress, nftArtifact.abi, deployer)
const nftAsMinter = new ethers.Contract(contractAddress, nftArtifact.abi, minter)
await nftAsDeployer.grantRole(minterRole, minter.address)
const nftAsAnyone = new ethers.Contract(contractAddress, nftArtifact.abi, anyone)

// GSN Testing
let web3provider
let gsnConf
let forwarderAddress
if (network == "localhost") {
    web3provider = new web3.providers.HttpProvider("http://localhost:8545")
    let testEnvObj = new require('@opengsn/dev').GsnTestEnvironment 
    let testEnv = testEnvObj.loadDeployment()
    paymasterAddress = testEnv.paymasterAddress
    forwarderAddress = testEnv.forwarderAddress
    gsnConf = { paymasterAddress: paymasterAddress }
} else if (network == "mumbai") {
    // From: https://docs.opengsn.org/networks/polygon/mumbai.html
    web3provider = new web3.providers.HttpProvider("https://matic-mumbai.chainstacklabs.com")
    paymasterAddress = "0xcA94aBEdcC18A10521aB7273B3F3D5ED28Cf7B8A"
    forwarderAddress = "0x4d4581c01A457925410cd3877d17b2fd4553b2C5"
    gsnConf = {
        paymasterAddress: paymasterAddress,
        relayLookupWindowBlocks: 990,
        relayRegistrationLookupBlocks: 990,
        pastEventsQueryMaxPageSize: 990,
    }
} else {
    throw "Unsupported network"
}

await nftAsDeployer.setTrustedForwarder(forwarderAddress)
let gsnWrapper = await Gsn.RelayProvider.newProvider({provider: web3provider, config: gsnConf}).init()
let gsnProvider = new ethers.providers.Web3Provider(gsnWrapper)
let gsnAcct = gsnProvider.provider.newAccount()
let gsnSigner = gsnProvider.getSigner(gsnAcct.address, gsnAcct.privateKey)
const nftAsGsnAcct = new ethers.Contract(contractAddress, nftArtifact.abi, gsnSigner)

// Example transactions 
// await nftAsMinter.authorizeMinting(456, anyone.address, "uid1.json", "uid1.json")
// await nftAsAnyone.mint(456)
// await nftAsDeployer.setBaseURI("https://newurl/")