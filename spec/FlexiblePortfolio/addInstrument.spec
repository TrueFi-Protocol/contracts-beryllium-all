import "FlexiblePortfolio.spec"

rule addInstrumentChecksCallerHasManagerRole() {
    address instrument;
    bytes issueInstrumentCalldata;

    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    addInstrument@withrevert(e, instrument, issueInstrumentCalldata);

    assert lastReverted;
}

rule addInstrumentChecksInstrumentIsAllowed() {
    address instrument;
    bytes issueInstrumentCalldata;

    require isInstrumentAllowed(instrument) == false;

    env e;
    addInstrument@withrevert(e, instrument, issueInstrumentCalldata);

    assert lastReverted;
}

rule addInstrumentChecksFunctionCallIsValid() {
    address instrument;
    bytes issueInstrumentCalldata;

    require instrument == fiol;
    require fiol.issueInstrumentSelector() != getBytes4(issueInstrumentCalldata);

    env e;
    addInstrument@withrevert(e, instrument, issueInstrumentCalldata);

    assert lastReverted;
}

rule addInstrumentSetsIsInstrumentAddedToTrue() {
    address instrument;
    bytes issueInstrumentCalldata;

    env e;
    uint256 instrumentId = addInstrument(e, instrument, issueInstrumentCalldata);

    assert isInstrumentAddedGhost(instrument, instrumentId);
}

rule onlyAddInstrumentChangesIsInstrumentAdded(method f) {
    address instrument;
    uint256 instrumentId;

    bool isInstrumentAdded_old = isInstrumentAddedGhost(instrument, instrumentId);

    env e;
    callFunction(f, e);

    bool isInstrumentAdded_new = isInstrumentAddedGhost(instrument, instrumentId);

    ifEffectThenFunction(
        isInstrumentAdded_new != isInstrumentAdded_old,
        f.selector == addInstrument(address, bytes).selector ||
        f.selector == addInstrumentFIOL(address,address,uint256,uint16,uint256,uint32,address,uint32,bool).selector
    );
    assert true;
}
