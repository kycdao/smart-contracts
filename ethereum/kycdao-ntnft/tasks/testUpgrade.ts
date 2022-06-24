import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')

task("testUpgrade", "Tests the upgradeability of a contract")
    .addParam("contract", "The name of the contract to test")
    .setAction(async ({ contract }, hre) => {    
    const testContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory

    console.log(`Deploying ${contract}...`)
    const deployedContract = await hre.upgrades.deployProxy(testContract, args, {initializer: 'initialize', kind: 'uups'})
    await deployedContract.deployed()
    console.log(`${contract} deployed to: ${deployedContract.address}`)
});

module.exports = {};