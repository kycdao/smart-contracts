import { task } from 'hardhat/config'
import { ethers } from 'ethers'
import { ContractFactory } from '@ethersproject/contracts'
const args = require('../initArgs')
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { ProxyUUPS } from '../src/types/contracts/ProxyUUPS'
import { Create2Deployer } from '../src/types/contracts/Create2Deployer'
import path from 'path'

const CREATE2_DEPLOYER_ADDRESS =
  "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2";

const AMOUNT = 0

function privateKey(mnemonic: string) {
    let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic)
    return mnemonicWallet.privateKey
}

task("createProxy", "Deploys the proxy (using xdeploy) to a network")
    .addParam("salt", "The salt used to give the correct deploy address in xdeploy")
    .setAction(async ({ salt }, hre) => {
        //Deploy proxy for implementation using xdeploy
        console.log(`Deploying proxy for implementation using xdeploy...`)

        const create2Abstract = (await hre.ethers.getContractFactory('contracts/Create2Deployer.sol:Create2Deployer')) as ContractFactory
        const create2Contract = create2Abstract.attach(CREATE2_DEPLOYER_ADDRESS) as Create2Deployer

        const proxyContract = await hre.ethers.getContractFactory('ProxyUUPS')
        const initcode = proxyContract.getDeployTransaction();

        const tx = await create2Contract.deploy(
            AMOUNT, 
            hre.ethers.utils.id(salt), 
            initcode.data, 
            {
                gasLimit: 1.2 * 10 ** 6,
                gasPrice: 50 * 10 ** 9
            }
        )

        console.log(`Deploying, tx: ${tx.hash}`)
        console.log(tx)

        await tx.wait(1)
});

module.exports = {};