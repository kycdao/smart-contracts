import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
// TODO: We can't use these types as they don't exist till we compile,
//       to fix this we'd need to run these via package.json (including option handling)
//       to ensure the compile runs first
// import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import { checkGasPrice, setGasPriceIfReq, removeDebugXdeployResult, 
    getPrivateKey, getXdeployResult, deployLogic, deployPriceFeed } from  './utils'

/**
 * TASK IMPLEMENTATION
 */

task("deploy", "Deploys the proxy and logic contract (using xdeploy) to a network")
    .addParam("contract", "The name of the logic contract to deploy")
    .addParam("salt", "The salt used to give the correct deploy address in xdeploy")
    .setAction(async ({ contract, salt }, hre) => {

        // Check gas price first
        await checkGasPrice(hre)

        console.log('Ok then, lets start the deployment!\n\n')

        // Compile contracts
        await hre.run('compile')

        // Deploy price feed if needed
        const deployedPriceFeedAddr = await deployPriceFeed(hre)

        // Deploy logic contract if needed
        const logicContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        const deployedLogicAddr = await deployLogic(hre, contract)

        // Deploy proxy for logic using xdeploy
        console.log(`\n\nDeploying proxy for logic using xdeploy...`)
        console.log('Removing old xdeploy debug result')
        removeDebugXdeployResult(hre)

        // Get private key for xdeploy
        const networkConf = hre.network.config as HttpNetworkConfig
        let privateKey = getPrivateKey(hre)

        hre.config.xdeploy = {
            contract: "ProxyUUPS",
            salt: salt,
            signer: privateKey,
            networks: [hre.network.name],
            rpcUrls: [networkConf.url],
            gasLimit: 12 * 10 ** 6,
        }
        console.log('\n\nDeploying proxy...')
        await setGasPriceIfReq(hre)
        await hre.run('xdeploy')

        console.log('Checking result...')
        const xdeployResult = getXdeployResult(hre)
        if (!xdeployResult.deployed) {
            console.error(`Proxy deployment failed! Error: `)
            console.error(xdeployResult.error)
            return
        }

        // Set the proxy to the new logic contract
        console.log('Proxy deployed\n\n')
        console.log('Setting proxy to logic contract and running initialize...')
        const proxyContractAbstract = (await hre.ethers.getContractFactory('ProxyUUPS')) as ContractFactory
        const proxyContract = proxyContractAbstract.attach(xdeployResult.address)
        const initArgs = args[contract]
        const initData = logicContract.interface.encodeFunctionData('initialize', [initArgs.name, initArgs.symbol, initArgs.baseURI, deployedPriceFeedAddr])
        await setGasPriceIfReq(hre)
        const tx = await proxyContract.initProxy(deployedLogicAddr, initData)
        console.log('Done')
});

module.exports = {};