import { HardhatUserConfig, task } from 'hardhat/config'
import { ethers } from 'ethers'
import '@openzeppelin/test-helpers'
import '@openzeppelin/hardhat-upgrades'
import '@nomiclabs/hardhat-waffle'
import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import '@typechain/hardhat'
import 'dotenv/config'
import "xdeployer"
import "./tasks/testUpgrade"
import "./tasks/deploy"
import "./tasks/upgrade"

import * as fs from 'fs'
const defaultNetwork = 'localhost'
const DEFAULT_HARDHAT_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

function mnemonic() {
  try {
    return fs.readFileSync('./mnemonic.txt').toString().trim()
  } catch (e) {
    if (defaultNetwork !== 'localhost') {
      console.log('☢️ WARNING: No mnemonic file created for a deploy account. Try `yarn run generate` and then `yarn run account`.')
    }
  }
  return ''
}

const config: HardhatUserConfig = {
  // xdeploy: {
  //   contract: "KycdaoNTNFT",
  //   // constructorArgsPath: "./constructorArgs.js",
  //   salt: "WAGMI1",
  //   signer: DEFAULT_HARDHAT_KEY,
  //   networks: ["localhost"],
  //   rpcUrls: ["http://127.0.0.1:8545/"],
  //   // gasLimit: 1.2 * 10 ** 6,
  // },
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.4.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
      accounts: {
        mnemonic: mnemonic(),
      },
    },
    mumbai: {
      url: 'https://polygon-mumbai.infura.io/v3/' + process.env.INFURA_ID,
      accounts: {
        mnemonic: mnemonic(),
      },      
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts: {
        mnemonic: mnemonic(),
      },      
    },    
    xdai: {
      url: 'https://rpc.xdaichain.com/',
      gasPrice: 1000000000,
      accounts: {
        mnemonic: mnemonic(),
      },
    },
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      // Eth and test nets (using etherscan)
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      ropsten: process.env.ETHERSCAN_API_KEY || '',
      rinkeby: process.env.ETHERSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      kovan: process.env.ETHERSCAN_API_KEY || '',
      // Polygon and mumbai testnet (using polygonscan) 
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',           
    }
  },
}

export default config