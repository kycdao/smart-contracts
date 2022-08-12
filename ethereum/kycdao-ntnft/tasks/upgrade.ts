import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
// TODO: We can't use these types as they don't exist till we compile,
//       to fix this we'd need to run these via package.json (including option handling)
//       to ensure the compile runs first
// import { UUPSUpgradeable } from '../src/types/@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable'
import { checkGasPrice, setGasPriceIfReq, deployLogic } from  './utils'

task("upgrade", "Upgrades the impl for a proxy contract to a network")
    .addParam("contract", "The name of the implementation contract to deploy")
    .addParam("proxyAddress", "The address of the proxy contract")
    .setAction(async ({ contract, proxyAddress }, hre) => {

        // Check gas price first
        await checkGasPrice(hre)

        // Compile contracts
        await hre.run('compile')

        // Deploy logic contract if needed
        const logicContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        const deployedLogicAddr = await deployLogic(hre, contract)

        // Update proxy to new implementation
        const proxyContract = logicContract.attach(proxyAddress)
        await setGasPriceIfReq(hre)
        await proxyContract.upgradeTo(deployedLogicAddr)

        console.log('Upgrade complete!')
});

module.exports = {};