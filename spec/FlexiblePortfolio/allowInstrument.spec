import "FlexiblePortfolio.spec"

rule allowInstrumentChecksCallerHasManagerRole() {
    address instrument;
    bool isAllowed;

    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    allowInstrument@withrevert(e, instrument, isAllowed);

    assert lastReverted;
}

rule onlyAllowInstrumentChangesIsInstrumentAllowed(method f) {
    address instrument;

    bool isInstrumentAllowed_old = isInstrumentAllowed(instrument);

    env e;
    callFunction(f, e);

    bool isInstrumentAllowed_new = isInstrumentAllowed(instrument);

    ifEffectThenFunction(
        isInstrumentAllowed_new != isInstrumentAllowed_old,
        f.selector == allowInstrument(address, bool).selector
    );
    assert true;
}

rule allowInstrumentNeverRevertsWhenUserHasManagerRole() {
    address instrument;
    bool isAllowed;

    env e;
    require e.msg.value == 0;
    require hasRole(MANAGER_ROLE(), e.msg.sender);
    allowInstrument@withrevert(e, instrument, isAllowed);

    assert !lastReverted;
}
