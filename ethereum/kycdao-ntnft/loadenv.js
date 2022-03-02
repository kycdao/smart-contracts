// A script to load some commonly used env into hardhat console
// contains some example transactions you might want to execute too

// !! Change this if you've deployed somewhere else !!
const contractAddress = "0xd9b477cD1a8f8942Aa1054aF1910f0A8cC824694"
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
const nftAsAnyone = new ethers.Contract(contractAddress, nftArtifact.abi, anyone)

// Example transactions 
// await nftAsDeployer.grantRole(minterRole, minter.address)
// await nftAsMinter.authorizeMinting(456, anyone.address, "uid1.json")
// await nftAsAnyone.mint(456)
// await nftAsDeployer.setBaseURI("https://newurl/")