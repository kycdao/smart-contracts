import { task } from 'hardhat/config'
import { ContractFactory } from '@ethersproject/contracts'
import { UUPSUpgradeable } from '../src/types/@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable'
import { checkGasPrice, setGasPriceIfReq, deployLogic } from  './utils'

task("upgrade", "Upgrades the impl for a proxy contract to a network")
    .addParam("contract", "The name of the implementation contract to deploy")
    .addParam("proxyAddress", "The address of the proxy contract")
    .setAction(async ({ contract, proxyAddress }, hre) => {

        // Check gas price first
        checkGasPrice(hre)

        //Deploy implementation contract    
        // Deploy logic contract if needed
        const logicContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        const deployedLogicAddr = await deployLogic(hre, contract)

        //Update proxy to new implementation
        const proxyContract = logicContract.attach(proxyAddress) as UUPSUpgradeable
        await setGasPriceIfReq(hre)
        await proxyContract.upgradeTo(deployedLogicAddr)

        console.log('Upgrade complete!')
});

module.exports = {};