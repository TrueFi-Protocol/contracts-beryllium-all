import "FlexiblePortfolio.spec"

rule setFeeStrategyChecksCallerHasStrategyAdminRole() {
    env e;
    require !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    setFeeStrategy@withrevert(e, _);

    assert lastReverted;
}

rule setFeeStrategyChecksNewFeeStrategyIsDifferentThanOldFeeStrategy() {
    address _feeStrategy;

    require _feeStrategy == feeStrategy();

    env e;
    setFeeStrategy@withrevert(e, _feeStrategy);

    assert lastReverted;
}

rule setFeeStrategySetsFeeStrategy() {
    address _feeStrategy;

    env e;
    setFeeStrategy(e, _feeStrategy);

    assert feeStrategy() == _feeStrategy;
}

rule setFeeStrategyChangesFeeStrategy() {
    address feeStrategy_old = feeStrategy();

    env e;
    setFeeStrategy(e, _);

    address feeStrategy_new = feeStrategy();

    assert feeStrategy_old != feeStrategy_new;
}

rule onlySetFeeStrategyChangesFeeStrategy(method f) {
    address feeStrategy_old = feeStrategy();

    env e;
    callFunction(f, e);

    address feeStrategy_new = feeStrategy();

    ifEffectThenFunction(
        feeStrategy_new != feeStrategy_old,
        f.selector == setFeeStrategy(address).selector
    );
    assert true;
}

rule setFeeStrategyNeverRevertsWhenConditionsMet() {
    address _feeStrategy;
    address feeStrategy_old = feeStrategy();

    env e;
    require e.msg.value == 0;
    setFeeStrategy@withrevert(e, _feeStrategy);

    assert lastReverted <=> (
        !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender) ||
        _feeStrategy == feeStrategy_old
    );
}
