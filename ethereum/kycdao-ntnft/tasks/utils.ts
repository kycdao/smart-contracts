import { ethers } from 'ethers'
import path from 'path'
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import fetch from 'node-fetch'
import { NETWORKS_MANUAL_GAS, NETWORK_CONGESTION_THRESHOLDS } from './constants'
import readline from 'readline'
import { ContractFactory } from '@ethersproject/contracts'
const priceFeeds = require('../priceFeeds')
enum PriceFeedType { CHAINLINK, BAND }

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

function logicDeployPath(hre:any, contract:string) {
    return path.normalize(
        path.join(
          hre.config.paths.root,
          "deployments",
          `${hre.network.name}_deployment_${contract}.json`
        )
      )
}

function priceFeedDeployPath(hre:any) {
    return path.normalize(
        path.join(
          hre.config.paths.root,
          "deployments",
          `${hre.network.name}_deployment_pricefeed.json`
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

function getLogicDeployResult(hre:any, contract:string) {
    createDeploymentsDir(hre)
    const logicPath = logicDeployPath(hre, contract)
    if (existsSync(logicPath)) {
        return require(logicPath)
    } else {
        return null
    }
}

function getPriceFeedDeployResult(hre:any) {
    createDeploymentsDir(hre)
    const priceFeedPath = priceFeedDeployPath(hre)
    if (existsSync(priceFeedPath)) {
        return require(priceFeedPath)
    } else {
        return null
    }
}

function createDeploymentsDir(hre:any) {
    const deploymentsDir = path.normalize(
        path.join(
          hre.config.paths.root,
          "deployments"
        )
      )
    if (!existsSync(deploymentsDir)) {
        console.log(`Creating deployments directory: ${deploymentsDir}`)
        mkdirSync(deploymentsDir)
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

async function checkGasPrice(hre:any) {
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
            process.exit(1);
        }
    }    
}

async function deployPriceFeed(hre:any): Promise<string> {
    console.log('Looking for existing price feed deploy with same bytecode...')
    const priceFeedContract = await hre.ethers.getContractFactory("PriceFeed")
    const priceFeedDeployResult = getPriceFeedDeployResult(hre)
    
    if (priceFeedDeployResult && priceFeedDeployResult.bytecode == priceFeedContract.bytecode) {
        console.log('Found existing price feed deploy with same bytecode, skipping deploy...')
        return priceFeedDeployResult.address
    } else {
        console.log('No existing price feed deploy found, deploying new price feed...')
        console.log('Checking which price feed to use for this network...')
        const priceFeedConf = priceFeeds[hre.network.name]
        if (!priceFeedConf) {
            throw new Error(`No price feed configured for network: ${hre.network.name}`)
        }

        await setGasPriceIfReq(hre)
        console.log(`Deploying price feed ${priceFeedConf.priceFeedType} at ${priceFeedConf.address}...`)
        const priceFeed = await priceFeedContract.deploy(...priceFeedDeployArgs(priceFeedConf))
        await priceFeed.deployed()
        console.log(`PriceFeed deployed to: ${priceFeed.address}`)
        console.log('Saving price feed deploy to result file...')
        const result = {
            address: priceFeed.address,
            bytecode: priceFeedContract.bytecode
        }
        writeFileSync(priceFeedDeployPath(hre), JSON.stringify(result))

        console.log('Waiting for 5 confirmations...')
        await priceFeed.deployTransaction.wait(5)

        console.log('Verifying source...')
        try {
            await hre.run("verify:verify", {
                address: priceFeed.address,
                contract: `contracts/PriceFeed.sol:PriceFeed`,
                constructorArguments: priceFeedDeployArgs(priceFeedConf)
            })
        } catch (e) {
            console.log(e.message)
            console.log('Failed to verify source, continuing...')
        }

        return priceFeed.address
    }
}

function priceFeedDeployArgs(priceFeedConf: any) {
    if (priceFeedConf.priceFeedType == 'CHAINLINK') {
        return [priceFeedConf.address, PriceFeedType.CHAINLINK, '', '']
    } else if (priceFeedConf.priceFeedType == 'BAND') {
        return [priceFeedConf.address, PriceFeedType.BAND, priceFeedConf.base, priceFeedConf.quote]
    } else {
        throw new Error(`Unknown price feed type: ${priceFeedConf.priceFeedType}`)
    }
}

async function deployLogic(hre:any, contract:string): Promise<string> {
    console.log('Looking for existing logic deploy with same bytecode...')
    const logicContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
    const logicDeploy = getLogicDeployResult(hre, contract)
    
    let deployedLogicAddr: string
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
        await deployedLogic.deployed()

        console.log(`Logic contract deployed at: ${deployedLogic.address}`)
        console.log('Saving logic deploy to result file...')
        const result = {
            address: deployedLogic.address,
            bytecode: logicContract.bytecode
        }
        writeFileSync(logicDeployPath(hre, contract), JSON.stringify(result))
        deployedLogicAddr = deployedLogic.address

        console.log('Waiting for 5 confirmations...')
        await deployedLogic.deployTransaction.wait(5)

        console.log('Verifying source...')
        try {
            await hre.run("verify:verify", {
                address: deployedLogicAddr,
                contract: `contracts/${contract}.sol:${contract}`
            })
        } catch (e) {
            console.log(e.message)
            console.log('Failed to verify source, continuing...')
        }        
    }

    return deployedLogicAddr
}

export {
    checkGasPrice,
    setGasPriceIfReq,
    asPrivateKey,
    getXdeployResult,
    getLogicDeployResult,
    removeDebugXdeployResult,
    logicDeployPath,
    deployLogic,
    deployPriceFeed
}