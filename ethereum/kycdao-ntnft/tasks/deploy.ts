import { task } from 'hardhat/config'
import { ethers } from 'ethers'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import path from 'path'

function privateKey(mnemonic: string) {
    let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic)
    return mnemonicWallet.privateKey
}

task("deploy", "Deploys the proxy and impl contract (using xdeploy) to a network")
    .addParam("contract", "The name of the implementation contract to deploy")
    .addParam("salt", "The salt used to give the correct deploy address in xdeploy")
    .setAction(async ({ contract, salt }, hre) => {
        //Deploy implementation contract    
        const implContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        // console.log(`Deploying implementation: ${contract}, to network: ${hre.network.name}...`)
        // const deployedImpl = await implContract.deploy()
        // console.log(`Started deployment tx: ${deployedImpl.deployTransaction.hash}, waiting for confirmations...`)
        // console.log({
        //     gasPrice: deployedImpl.deployTransaction.gasPrice,
        //     gasLimit: deployedImpl.deployTransaction.gasLimit,
        //     nonce: deployedImpl.deployTransaction.nonce,
        //     address: deployedImpl.address
        // })
        // await deployedImpl.deployTransaction.wait(1)
        // console.log(`Implementation deployed at: ${deployedImpl.address}`)

        //Deploy proxy for implementation using xdeploy
        // console.log(`Deploying proxy for implementation using xdeploy...`)
        // const networkConf = hre.network.config as HttpNetworkConfig
        // const netAccts = networkConf.accounts as HttpNetworkHDAccountsConfig
        // hre.config.xdeploy = {
        //     contract: "ProxyUUPS",
        //     // constructorArgsPath: "./emptyArgs.js",
        //     salt: salt,
        //     signer: privateKey(netAccts.mnemonic),
        //     networks: [hre.network.name],
        //     rpcUrls: [networkConf.url],
        //     gasLimit: 1.2 * 10 ** 6,
        // }
        // await hre.run('xdeploy')

        // const xdeployPath = path.normalize(
        //     path.join(
        //       hre.config.paths.root,
        //       "deployments",
        //       `${hre.network.name}_deployment.json`
        //     )
        //   )
        // const xdeployResult = require(xdeployPath)
        // if (!xdeployResult.deployed) {
        //     console.error("Proxy deployment failed! See xdeploy logs for details")
        //     return
        // }

        // Set the proxy to the new implementation
        console.log('Setting proxy to implementation and running initialize...')
        const proxyContractAbstract = (await hre.ethers.getContractFactory('ProxyUUPS')) as ContractFactory
        const proxyContract = proxyContractAbstract.attach('0xdf1fc8279c15746450f005cf6ae7992d15b08755') as ProxyUUPS
        const initData = implContract.interface.encodeFunctionData('initialize', [args.name, args.symbol, args.baseURI, args.verificationBaseURI])
        const tx = await proxyContract.initProxy('0x94990696c95a1f10d27391ab5d37cb8b3172c186', initData)
        console.log('Done')

        // // Verify implementation source
        // console.log('Verifying source...')
        // console.log('Waiting for 5 confirmations...')
        // await tx.wait(5)
        // await hre.run("verify:verify", {address: deployedImpl.address})

        // console.log('Deployment complete!')
});

module.exports = {};