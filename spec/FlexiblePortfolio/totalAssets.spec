import "FlexiblePortfolio.spec"
import "feeInvariants.spec"

use invariant unpaidFeeOrVirtualTokenBalanceIsZero

rule totalAssetsIsGTEVirtualTokenBalance() {
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();

    env e;
    require e.block.timestamp == lastUpdateTimeHarness();
    assert totalAssets(e) >= virtualTokenBalance();
}

rule tokenTransferDoesNotAffectTotalAssets() {
    env e1;
    uint256 totalAssets_old = totalAssets(e1);

    env e2;
    token.transfer(e2, _, _);

    env e3;
    require e3.block.timestamp == e1.block.timestamp;
    uint256 totalAssets_new = totalAssets(e3);

    assert totalAssets_new == totalAssets_old;
}

rule tokenTransferFromDoesNotAffectTotalAssets() {
    env e1;
    uint256 totalAssets_old = totalAssets(e1);

    env e2;
    token.transferFrom(e2, _, _, _);

    env e3;
    require e3.block.timestamp == e1.block.timestamp;
    uint256 totalAssets_new = totalAssets(e3);

    assert totalAssets_new == totalAssets_old;
}

rule totalAssetsNeverRevertsIfValuationStrategyCalculateValueDoesntRevert() {
    uint256 timestamp;
    require timestamp > lastUpdateTimeHarness();

    env e1;
    require e1.block.timestamp == timestamp;
    mathint valuationStrategyCalculatedValue = valuationStrategy.calculateValue@withrevert(e1, currentContract);
    require !lastReverted;

    mathint _totalAssets = virtualTokenBalance() + valuationStrategyCalculatedValue;
    require _totalAssets <= max_uint256;

    mathint unpaidFees = unpaidProtocolFee() + unpaidManagerFee();
    require unpaidFees <= max_uint256;

    if (_totalAssets > unpaidFees) {
        mathint timeAdjustedTotalAssets = (_totalAssets - unpaidFees) * (timestamp - lastUpdateTimeHarness());
        require timeAdjustedTotalAssets <= max_uint256;
        
        require timeAdjustedTotalAssets * lastProtocolFeeRate() <= max_uint256;
        require timeAdjustedTotalAssets * lastManagerFeeRate() <= max_uint256;

        mathint accruedProtocolFee = (timeAdjustedTotalAssets * lastProtocolFeeRate()) / YEAR() / BASIS_PRECISION();
        mathint accruedManagerFee = (timeAdjustedTotalAssets * lastManagerFeeRate()) / YEAR() / BASIS_PRECISION();

        require unpaidProtocolFee() + accruedProtocolFee <= max_uint256;
        require unpaidManagerFee() + accruedManagerFee <= max_uint256;
    }
    
    env e;
    require e.block.timestamp == timestamp;
    require e.msg.value == 0;
    totalAssets@withrevert(e);

    assert !lastReverted;
}
