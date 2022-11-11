// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

// These wallets are used to test sending KYC NFTs to an address
// that is a contract

interface IKYCNFT {
    function mint(uint32 _auth_code) external payable;
    function authorizeMinting(uint32 _auth_code, address _dst, string memory _metadata_cid, string memory _verification_path, 
        uint _expiry, bool _skipPayment) external;    
}

contract KYCTestWallet {
    IKYCNFT kyc;
    uint32 auth_code;

    function mint(IKYCNFT _kyc, uint32 _auth_code) external payable {
        kyc = _kyc;
        auth_code = _auth_code;
        _kyc.mint{value: msg.value}(_auth_code);
    }

    function prepareAuthMint(uint32 _auth_code) external {
        auth_code = _auth_code;
    }
}

// This wallet is a simple contract that rejects any tokens sent to it
contract InvalidRespTestWallet is KYCTestWallet {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return 0;
    }    
}

// This wallet is a simple contract that reverts when any tokens are sent to it
contract RevertTestWallet is KYCTestWallet {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        revert("RevertTestWallet");
    }    
}

// This wallet is a simple contract that has no onERC721Received function
contract NoRespTestWallet is KYCTestWallet {
    receive() external payable {}
}

// This wallet is a simple contract that emits an event when any tokens are sent to it
contract EventTestWallet is KYCTestWallet {
    event Received(address, address, uint256, bytes);
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4) {
        emit Received(operator, from, tokenId, data);
        return this.onERC721Received.selector;
    }    
}

// This wallet is a simple contract that emits an event when the receive function is called
contract EventReceiveTestWallet is KYCTestWallet {
    event ReceivedRefund(address, uint256);
    receive() external payable {
        emit ReceivedRefund(msg.sender, msg.value);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }    
}

// This wallet is a simple contract that reverts when the receive function is called
contract RevertReceiveTestWallet is KYCTestWallet {
    receive() external payable {
        revert("RevertReceiveTestWallet");
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }    
}

// This wallet is a simple contract that attempts to reenter the contract from the receive function
contract ReenterReceiveTestWallet is KYCTestWallet {
    receive() external payable {
        kyc.mint{value: msg.value}(auth_code);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }    
}

// This wallet is a simple contract that attempts to reenter the contract from the onERC721Received function
contract ReenterTestWallet is KYCTestWallet {
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        kyc.mint(auth_code);
        return this.onERC721Received.selector;
    }    
}

// This wallet is a simple contract that attempts to reenter the contract from via authorizeMinting
contract ReenterAuthorizeTestWallet is KYCTestWallet {
    receive() external payable {
        kyc.authorizeMinting(auth_code, address(this), "", "", 0, true);
    }    
}