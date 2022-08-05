import { ethers } from 'ethers'
import path from 'path'
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import fetch from 'node-fetch'
import { NETWORKS_MANUAL_GAS, NETWORK_CONGESTION_THRESHOLDS } from './constants'
import readline from 'readline'
import { ContractFactory } from '@ethersproject/contracts'

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
            return
        }
    }    
}

async function deployLogic(hre:any, contract:any): Promise<string> {
    console.log('Looking for existing logic deploy with same bytecode...')
    const logicContract = (await hre.ethers.getContractFactory(contract)) as ContractFactory
    const logicDeploy = getLogicDeployResult(hre)
    
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
        await deployedLogic.deployTransaction.wait(1)
        console.log(`Logic contract deployed at: ${deployedLogic.address}`)
        console.log('Saving logic deploy to result file...')
        const result = {
            address: deployedLogic.address,
            bytecode: logicContract.bytecode
        }
        writeFileSync(logicDeployPath(hre), JSON.stringify(result))
        deployedLogicAddr = deployedLogic.address

        console.log('Verifying source...')
        console.log('Waiting for 5 confirmations...')
        await deployedLogic.wait(5)
        await hre.run("verify:verify", {
            address: deployedLogicAddr,
            contract: `contracts/${contract}.sol:${contract}`
        })        
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
    deployLogic
}