import "AutomatedLineOfCredit.spec"

rule borrowDepositAndMintAreBlockedAfterEndDate(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    uint256 timestamp;
    require timestamp > endDate();

    env e;
    require e.block.timestamp == timestamp;
    callFunctionWithRevert(f, e);

    ifEffectThenFunction(
        !lastReverted,
        f.selector != borrow(uint256).selector &&
        f.selector != deposit(uint256,address).selector &&
        f.selector != mint(uint256,address).selector
    );
    assert true;
}

rule endDateCannotChange(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    uint256 endDate_old = endDate();

    env e;
    callFunction(f, e);

    uint256 endDate_new = endDate();

    assert endDate_new == endDate_old;
}

rule statusIsClosedAfterEndDate() {
    env e;
    require e.block.timestamp > endDate();
    assert getStatus(e) == STATUS_CLOSED();
}
