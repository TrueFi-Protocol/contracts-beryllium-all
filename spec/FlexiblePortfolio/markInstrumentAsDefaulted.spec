import "FlexiblePortfolio.spec"

rule markInstrumentAsDefaultedChecksCallerHasManagerRole() {
    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    markInstrumentAsDefaulted@withrevert(e, _, _);

    assert lastReverted;
}

rule markInstrumentAsDefaultedSetsLoanStatusToDefaulted() {
    uint256 instrumentId;

    env e;
    markInstrumentAsDefaulted(e, fiol, instrumentId);

    assert fiol.status(instrumentId) == Defaulted();
}

rule onlyMarkInstrumentAsDefaultedChangesLoanStatusToDefaulted(method f) {
    uint256 instrumentId;

    uint8 loanStatus_old = fiol.status(instrumentId);

    env e;
    callFunctionWithFIOL(f, e);

    uint8 loanStatus_new = fiol.status(instrumentId);

    ifEffectThenFunction(
        loanStatus_new != loanStatus_old && loanStatus_new == Defaulted(),
        f.selector == markInstrumentAsDefaulted(address, uint256).selector
    );
    assert true;
}
