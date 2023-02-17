module.exports = {
    polygon: {
        priceFeedType: 'CHAINLINK',
        address: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    },
    mumbai: {
        priceFeedType: 'CHAINLINK',
        address: '0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada'
    },
    celo: {
        priceFeedType: 'BAND',
        address: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
        base: 'CELO',
        quote: 'USD'
    },
    alfajores: {
        priceFeedType: 'BAND',
        address: '0x660cBc25F0cFD31F0Bdcaa43525f0bACC6DB2ABc',
        base: 'CELO',
        quote: 'USD'
    },
    goerli: {
        priceFeedType: 'CHAINLINK',
        address: '0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e'
    },
    arbitrumMain: {
        priceFeedType: 'CHAINLINK',
        address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612'
    },
    arbitrumTestnet: {
        priceFeedType: 'CHAINLINK',
        address: '0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08'
    }            
}