import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
import { UUPSUpgradeable } from '../src/types/@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable'

task("upgrade", "Upgrades the impl for a proxy contract to a network")
    .addParam("contract", "The name of the implementation contract to deploy")
    .addParam("proxyAddress", "The address of the proxy contract")
    .setAction(async ({ contract, proxyAddress }, hre) => {
        //Deploy implementation contract    
        const implContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        console.log(`Deploying implementation: ${contract}, to network: ${hre.network.name}...`)
        const deployedImpl = await implContract.deploy()        
        console.log(`Implementation deployed at: ${deployedImpl.address}`)

        // Verify implementation source
        console.log('Verifying source...')
        console.log('Waiting for 5 confirmations...')
        await deployedImpl.deployTransaction.wait(5)
        await hre.run("verify:verify", {address: deployedImpl.address})

        //Update proxy to new implementation
        const proxyContract = implContract.attach(proxyAddress) as UUPSUpgradeable
        await proxyContract.upgradeTo(deployedImpl.address)

        console.log('Upgrade complete!')
});

module.exports = {};