import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig, HardhatRuntimeEnvironment } from 'hardhat/types';
// TODO: We can't use these types as they don't exist till we compile,
//       to fix this we'd need to run these via package.json (including option handling)
//       to ensure the compile runs first
// import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import { setGasPriceIfReq, deployLogic, deployPriceFeed, getZkDeployer } from  './utils'

/**
 * TASK IMPLEMENTATION
 */

task("deploy_zkSync", "Deploys the proxy and logic contract to a zkSync network")
    .addParam("contract", "The name of the logic contract to deploy")
    .setAction(async ({ contract }, hre: HardhatRuntimeEnvironment) => {
        
        // Check gas price first
        // await checkGasPrice(hre)

        console.log('Ok then, lets start the deployment!\n\n')

        // Compile contracts
        await hre.run('compile')

        // Deploy price feed if needed
        const deployedPriceFeedAddr = await deployPriceFeed(hre)

        // Deploy logic contract if needed
        const deployedLogicAddr = await deployLogic(hre, contract)

        // Deploy proxy for logic
        console.log(`\n\nDeploying proxy for logic...`)
        const zkDeployer = getZkDeployer(hre)
        const proxyContractAbstract = await zkDeployer.loadArtifact('ProxyUUPS')
        const proxyDeployed = await zkDeployer.deploy(proxyContractAbstract)

        // Set the proxy to the new logic contract
        console.log(`Proxy deployed to: ${proxyDeployed.address}\n\n`)
        console.log('Setting proxy to logic contract and running initialize...')
        
        const initArgs = args[contract]
        const logicContract = await hre.ethers.getContractFactory(contract)
        const initData = logicContract.interface.encodeFunctionData('initialize', [initArgs.name, initArgs.symbol, initArgs.baseURI, deployedPriceFeedAddr])
        await setGasPriceIfReq(hre)
        const tx = await proxyDeployed.initProxy(deployedLogicAddr, initData)
        console.log('Done')
});

module.exports = {};