import "AutomatedLineOfCredit.spec"
import "unpaidFee.spec"

use invariant unpaidFeeOrVirtualTokenBalanceIsZero

definition totalAssetsIsGTEVirtualTokenBalanceDefinition(env e) returns bool =
    totalAssets(e) >= virtualTokenBalance();

rule totalAssetsIsGTEVirtualTokenBalance() {
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    env e;
    require e.block.timestamp == timestamp;
    assert totalAssetsIsGTEVirtualTokenBalanceDefinition(e);
}

// timeout
// rule tokenTransferDoesNotAffectTotalAssets() {
//     env e1;
//     uint256 totalAssets_old = totalAssets(e1);

//     env e2;
//     token.transfer(e2, _, _);

//     env e3;
//     require e3.block.timestamp == e1.block.timestamp;
//     uint256 totalAssets_new = totalAssets(e3);

//     assert totalAssets_new == totalAssets_old;
// }

// rule tokenTransferFromDoesNotAffectTotalAssets() {
//     env e1;
//     uint256 totalAssets_old = totalAssets(e1);

//     env e2;
//     token.transferFrom(e2, _, _, _);

//     env e3;
//     require e3.block.timestamp == e1.block.timestamp;
//     uint256 totalAssets_new = totalAssets(e3);

//     assert totalAssets_new == totalAssets_old;
// }

rule repaysDoNotAffectTotalAssets() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 totalAssets_old = totalAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    repay(e2, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 totalAssets_new = totalAssets(e3);

    assert totalAssets_new == totalAssets_old;
}

rule totalAssetsDecreaseOverTimeAtZeroTotalDebt() {
    uint256 timestamp;
    env e1;
    require e1.block.timestamp == timestamp;
    // translates to zero utilization
    require totalDebt(e1) == 0;

    env e2;
    require e2.block.timestamp == timestamp;
    uint256 totalAssets_old = totalAssets(e2);

    env e3;
    require e3.block.timestamp > timestamp;
    uint256 totalAssets_new = totalAssets(e3);

    require totalAssets_new != totalAssets_old;

    assert totalAssets_new < totalAssets_old;
}

rule totalAssetsIncreaseOverTimeWithNoFees() {
    uint256 timestamp;
    require lastUpdateTimeGhost <= timestamp;

    require unpaidFee() == 0;
    require lastProtocolFeeRate() == 0;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 totalAssets_old = totalAssets(e1);

    env e2;
    require e2.block.timestamp > timestamp;
    uint256 totalAssets_new = totalAssets(e2);

    require totalAssets_new != totalAssets_old;

    assert totalAssets_new > totalAssets_old;
}

// timeouts
// rule totalAssetsNeverReverts() {
//     uint256 timestamp;
//     require lastUpdateTimeGhost < timestamp;

//     env e1;
//     require e1.block.timestamp == timestamp;
//     uint256 totalDebt = totalDebt@withrevert(e1);
//     require !lastReverted;

//     require timestamp * lastProtocolFeeRate() <= max_uint256;
//     require timestamp * lastProtocolFeeRate() * (totalDebt + virtualTokenBalance()) <= max_uint256;
//     require totalDebt + virtualTokenBalance() <= max_uint256;

//     env e2;
//     require e2.msg.value == 0;
//     require e2.block.timestamp == timestamp;
//     totalAssets@withrevert(e2);

//     assert !lastReverted;
// }

rule totalAssetsCannotBeDecreasedWithNoShares(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    address sender;
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    require balanceOf(sender) == 0;
    require forall address _owner. _allowanceGhost(_owner, sender) == 0;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 totalAssets_old = totalAssets(e1);

    env e2;
    require e2.msg.sender == sender;
    require e2.block.timestamp == timestamp;
    callFunction(f, e2);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 totalAssets_new = totalAssets(e3);

    assert totalAssets_new >= totalAssets_old;
}
