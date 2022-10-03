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

function test_mnemonic() {
  return get_mnemonic('./test_mnemonic.txt')
}

function mnemonic() {
  return get_mnemonic('./mnemonic.txt')
}

function get_mnemonic(path: string) {
  try {
    return fs.readFileSync(path).toString().trim()
  } catch (e) {
    if (defaultNetwork !== 'localhost') {
      console.log('☢️ WARNING: No mnemonic file created for a deploy account. Try `yarn run generate` and then `yarn run account`.')
    }
  }
  return ''
}

const config: HardhatUserConfig = {
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
    polygon: {
      url: 'https://polygon-mainnet.infura.io/v3/' + process.env.INFURA_ID,
      // gasPrice: 50 * 1000000000,
      accounts: {
        mnemonic: mnemonic(),
      },
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
      accounts: {
        mnemonic: test_mnemonic(),
      },
    },
    mumbai: {
      url: 'https://polygon-mumbai.infura.io/v3/' + process.env.INFURA_ID,
      accounts: {
        mnemonic: test_mnemonic(),
      },      
    },
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: {
        mnemonic: test_mnemonic(),
      },
      chainId: 44787
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: {
        mnemonic: mnemonic(),
      },
      chainId: 42220
    },    
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts: {
        mnemonic: test_mnemonic(),
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
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io"
        }
      },
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io"
        }
      }      
    ],    
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
      // CELO and alfajores testnet (using celoscan) 
      celo: process.env.CELOSCAN_API_KEY || '',
      alfajores: process.env.CELOSCAN_API_KEY || '',
    }
  },
}

export default config