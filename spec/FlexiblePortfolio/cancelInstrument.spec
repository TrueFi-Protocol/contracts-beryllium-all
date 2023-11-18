import "FlexiblePortfolio.spec"

rule cancelInstrumentChecksCallerHasManagerRole() {
    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    cancelInstrument@withrevert(e, _, _);

    assert lastReverted;
}

rule cancelInstrumentSetsLoanStatusToCanceled() {
    uint256 instrumentId;

    env e;
    cancelInstrument(e, fiol, instrumentId);

    assert fiol.status(instrumentId) == Canceled();
}

rule onlyCancelInstrumentChangesLoanStatusToCanceled(method f) {
    uint256 instrumentId;

    uint8 loanStatus_old = fiol.status(instrumentId);

    env e;
    callFunctionWithFIOL(f, e);

    uint8 loanStatus_new = fiol.status(instrumentId);

    ifEffectThenFunction(
        loanStatus_new != loanStatus_old && loanStatus_new == Canceled(),
        f.selector == cancelInstrument(address, uint256).selector
    );
    assert true;
}
