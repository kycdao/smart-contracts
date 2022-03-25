// import { HardhatUserConfig, task } from 'hardhat/config'
import '@openzeppelin/test-helpers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'hardhat-typechain'

import * as fs from 'fs'
const defaultNetwork = 'localhost'

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

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.7',
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
      url: 'https://rinkeby.infura.io/v3/460f40a260564ac4a4f4b3fffb032dad', //<---- YOUR INFURA ID! (or it won't work)
      accounts: {
        mnemonic: mnemonic(),
      },
    },
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com/',
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
      mainnet: "ETHERSCAN_API_KEY",
      ropsten: "ETHERSCAN_API_KEY",
      rinkeby: "ETHERSCAN_API_KEY",
      goerli: "ETHERSCAN_API_KEY",
      kovan: "ETHERSCAN_API_KEY",
      // Polygon and mumbai testnet (using polygonscan) 
      polygon: "POLYGONSCAN_API_KEY",
      polygonMumbai: "POLYGONSCAN_API_KEY",           
    }
  },
}
