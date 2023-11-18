import "FlexiblePortfolio.spec"

rule setValuationStrategyChecksCallerHasStrategyAdminRole() {
    env e;
    require !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    setValuationStrategy@withrevert(e, _);

    assert lastReverted;
}

rule setValuationStrategyChecksNewValuationStrategyIsDifferentThanOldValuationStrategy() {
    address _valuationStrategy;

    require _valuationStrategy == valuationStrategy();

    env e;
    setValuationStrategy@withrevert(e, _valuationStrategy);

    assert lastReverted;
}

rule setValuationStrategySetsValuationStrategy() {
    address _valuationStrategy;

    env e;
    setValuationStrategy(e, _valuationStrategy);

    assert valuationStrategy() == _valuationStrategy;
}

rule setValuationStrategyChangesValuationStrategy() {
    address valuationStrategy_old = valuationStrategy();

    env e;
    setValuationStrategy(e, _);

    address valuationStrategy_new = valuationStrategy();

    assert valuationStrategy_old != valuationStrategy_new;
}

rule onlySetValuationStrategyChangesValuationStrategy(method f) {
    address valuationStrategy_old = valuationStrategy();

    env e;
    callFunction(f, e);

    address valuationStrategy_new = valuationStrategy();

    ifEffectThenFunction(
        valuationStrategy_new != valuationStrategy_old,
        f.selector == setValuationStrategy(address).selector
    );
    assert true;
}

rule setValuationStrategyNeverRevertsWhenConditionsMet() {
    address _valuationStrategy;
    address valuationStrategy_old = valuationStrategy();

    env e;
    require e.msg.value == 0;
    setValuationStrategy@withrevert(e, _valuationStrategy);

    assert lastReverted <=> (
        !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender) ||
        _valuationStrategy == valuationStrategy_old
    );
}
