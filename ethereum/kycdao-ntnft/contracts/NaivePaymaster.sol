// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@opengsn/contracts/src/BasePaymaster.sol";

/// @notice This is simply a template for a PayMaster we would use on a GSN supported chain.
/// It would accept calls from any address at the moment and pay the gas for them, as long as
/// the target is correct (i.e. the KycdaoNTNFT). Requires more thought as to how this could be used.
/// FYI - on testnets there's usually a PayMaster which accepts all calls deployed already,
/// hence we wouldn't need to deploy this on testnets anyway.
contract NaivePaymaster is BasePaymaster {
	address public ourTarget;   // The target contract we are willing to pay for

	// allow the owner to set ourTarget
	event TargetSet(address target);
	function setTarget(address target) external onlyOwner {
		ourTarget = target;
		emit TargetSet(target);
	}

	event PreRelayed(uint);
	event PostRelayed(uint);


	function preRelayedCall(
		GsnTypes.RelayRequest calldata relayRequest,
		bytes calldata signature,
		bytes calldata approvalData,
		uint256 maxPossibleGas
	) external override virtual
	returns (bytes memory context, bool) {
		_verifyForwarder(relayRequest);
		(signature, approvalData, maxPossibleGas);
		
		require(relayRequest.request.to == ourTarget);
		emit PreRelayed(block.timestamp);
                return (abi.encode(block.timestamp), false);
	}

	function postRelayedCall(
		bytes calldata context,
		bool success,
		uint256 gasUseWithoutPost,
		GsnTypes.RelayData calldata relayData
	) external override virtual {
                (context, success, gasUseWithoutPost, relayData);
		emit PostRelayed(abi.decode(context, (uint)));
	}

  function versionPaymaster() external virtual view override returns (string memory) {
    return "2.2.6";
  }

}