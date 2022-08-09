/**
 * From MetaMask:
 * Represents levels for `networkCongestion` (calculated along with gas fee
 * estimates; represents a number between 0 and 1)
 */
    const NETWORK_CONGESTION_THRESHOLDS = {
    NOT_BUSY: 0,
    STABLE: 0.33,
    BUSY: 0.66,
}

// List of networks where we need to manually set gasPrice
const NETWORKS_MANUAL_GAS = ['polygon', 'mumbai']

export {
    NETWORK_CONGESTION_THRESHOLDS,
    NETWORKS_MANUAL_GAS
}