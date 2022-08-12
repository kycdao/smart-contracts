import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')

task("testUpgrade", "Tests the upgradeability of a contract")
    .addParam("contract", "The name of the contract to test")
    .setAction(async ({ contract }, hre) => {    
        // Compile contracts
        await hre.run('compile')

        // Run deployment via upgrades plugin
        console.log(`Deploying ${contract}...`)
        const testContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        const deployedContract = await hre.upgrades.deployProxy(testContract, [args.name, args.symbol, args.baseURI, args.verificationBaseURI], {initializer: 'initializeStd', kind: 'uups'})
        await deployedContract.deployed()
        console.log(`${contract} deployed to: ${deployedContract.address}`)
});

module.exports = {};