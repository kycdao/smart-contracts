import { task } from 'hardhat/config'
import { ethers } from 'ethers'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import path from 'path'
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import fetch from 'node-fetch'
import readline from 'readline'

/**
 * From MetaMask:
 * Represents levels for `networkCongestion` (calculated along with gas fee
 * estimates; represents a number between 0 and 1)
 */
const NETWORK_CONGESTION_THRESHOLDS = {
    NOT_BUSY: 0,
    STABLE: 0.33,
    BUSY: 0.66,
  };


// List of networks where we need to manually set gasPrice
const NETWORKS_MANUAL_GAS = ['polygon']

/**
 * UTILITY FUNCTIONS
 */

function asPrivateKey(mnemonic: string) {
    let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic)
    return mnemonicWallet.privateKey
}

function xdeployDebugResultPath(hre:any) {
    return path.normalize(
        path.join(
          hre.config.paths.root,
          "deployments",
          `${hre.network.name}_deployment_debug.json`
        )
      )
}

function xdeployResultPath(hre:any) {
    return path.normalize(
        path.join(
          hre.config.paths.root,
          "deployments",
          `${hre.network.name}_deployment.json`
        )
      )
}

function logicDeployPath(hre:any) {
    return path.normalize(
        path.join(
          hre.config.paths.root,
          "deployments",
          `${hre.network.name}_deployment_logic.json`
        )
      )
}

function removeDebugXdeployResult(hre:any) {
    const resultPath = xdeployDebugResultPath(hre)
    if (existsSync(resultPath)) unlinkSync(resultPath)
}

function getXdeployResult(hre:any) {
    const debugPath = xdeployDebugResultPath(hre)
    if (existsSync(debugPath)) {
        return require(debugPath)
    }

    return require(xdeployResultPath(hre))
}

function getLogicDeployResult(hre:any) {
    const logicPath = logicDeployPath(hre)
    if (existsSync(logicPath)) {
        return require(logicPath)
    } else {
        return null
    }
}

async function getGasPriceInfo(hre:any) {
    const chainId = await getChainId(hre)
    const resp = await fetch(`https://gas-api.metaswap.codefi.network/networks/${chainId}/suggestedGasFees`)
    return await resp.json()
}

async function getChainId(hre:any) {
    const resp = await hre.network.provider.send('eth_chainId')
    return Number(resp)
}

async function setGasPriceIfReq(hre:any) {
    if (NETWORKS_MANUAL_GAS.includes(hre.network.name)) {
        const gasPriceInfo = await getGasPriceInfo(hre)
        const gasPrice = Math.round(Number(gasPriceInfo.high.suggestedMaxFeePerGas))
        hre.config.networks[hre.network.name].gasPrice = gasPrice * 10 ** 9
        console.log(`Setting gasPrice to: ${gasPrice} gwei`)
    }
}

/**
 * TASK IMPLEMENTATION
 */

task("deploy", "Deploys the proxy and logic contract (using xdeploy) to a network")
    .addParam("contract", "The name of the logic contract to deploy")
    .addParam("salt", "The salt used to give the correct deploy address in xdeploy")
    .setAction(async ({ contract, salt }, hre) => {

        // Check gas price first
        const gasPriceInfo = await getGasPriceInfo(hre)
        if (gasPriceInfo.networkCongestion > NETWORK_CONGESTION_THRESHOLDS.BUSY) {
            console.log(`Network congestion on ${hre.network.name} is currently high: ${gasPriceInfo.networkCongestion}`)
            console.log(`Current estimated gas price is: ${gasPriceInfo.high.suggestedMaxFeePerGas}`)
            const rl = readline.createInterface(process.stdin, process.stdout)
            const p = new Promise(res => {
                rl.question('Would you still like to continue? (y/n): ', res)
            })
            const response = await p
            if (response != 'y') {
                return
            }
        }

        // Deploy logic contract if needed
        console.log('Ok then, lets start the deployment!\n\n')

        console.log('Looking for existing logic deploy with same bytecode...')
        const logicContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
        const logicDeploy = getLogicDeployResult(hre)
        
        let deployedLogicAddr
        if (logicDeploy && logicDeploy.bytecode == logicContract.bytecode) {
            console.log(`Found existing logic contract deployed to network with same bytecode at: ${logicDeploy.address}`)
            console.log('Skipping implementation deployment...')
            deployedLogicAddr = logicDeploy.address
        } else {
            console.log('No deployment found with same bytecode')
            console.log(`Deploying logic contract: ${contract}, to network: ${hre.network.name}...`)
            await setGasPriceIfReq(hre)
            const deployedLogic = await logicContract.deploy()
            console.log(`Started deployment tx: ${deployedLogic.deployTransaction.hash}, waiting for confirmations...`)
            console.log({
                gasPrice: deployedLogic.deployTransaction.gasPrice,
                gasLimit: deployedLogic.deployTransaction.gasLimit,
                nonce: deployedLogic.deployTransaction.nonce,
                address: deployedLogic.address
            })
            await deployedLogic.deployTransaction.wait(1)
            console.log(`Logic contract deployed at: ${deployedLogic.address}`)
            console.log('Saving logic deploy to result file...')
            const result = {
                address: deployedLogic.address,
                bytecode: logicContract.bytecode
            }
            writeFileSync(logicDeployPath(hre), JSON.stringify(result))
            deployedLogicAddr = deployedLogic.address
        }

        // Deploy proxy for logic using xdeploy
        console.log(`\n\nDeploying proxy for logic using xdeploy...`)
        console.log('Removing old xdeploy debug result')
        removeDebugXdeployResult(hre)

        // Check if we're using private keys directly or a seed phrase in accounts
        const networkConf = hre.network.config as HttpNetworkConfig
        let privateKey: string = (() => {
            if (Array.isArray(networkConf.accounts)) {
                return networkConf.accounts[0]
            } else {
                const netAccts = networkConf.accounts as HttpNetworkHDAccountsConfig
                return asPrivateKey(netAccts.mnemonic)
            }
        })()

        hre.config.xdeploy = {
            contract: "ProxyUUPS",
            salt: salt,
            signer: privateKey,
            networks: [hre.network.name],
            rpcUrls: [networkConf.url],
            gasLimit: 1.2 * 10 ** 6,
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
        const proxyContract = proxyContractAbstract.attach(xdeployResult.address) as ProxyUUPS
        const initData = logicContract.interface.encodeFunctionData('initialize', [args.name, args.symbol, args.baseURI, args.verificationBaseURI])
        await setGasPriceIfReq(hre)
        const tx = await proxyContract.initProxy(deployedLogicAddr, initData)
        console.log('Done')

        // Verify logic contract source
        console.log('Verifying source...')
        console.log('Waiting for 5 confirmations...')
        await tx.wait(5)
        await hre.run("verify:verify", {address: deployedLogicAddr})

        console.log('Deployment complete!')
});

module.exports = {};