import "FlexiblePortfolio.spec"

rule updateInstrumentChecksCallerHasManagerRole() {
    address instrument;
    bytes updateInstrumentCalldata;

    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    updateInstrument@withrevert(e, instrument, updateInstrumentCalldata);

    assert lastReverted;
}

rule updateInstrumentChecksInstrumentIsAllowed() {
    address instrument;
    bytes updateInstrumentCalldata;

    require isInstrumentAllowed(instrument) == false;

    env e;
    updateInstrument@withrevert(e, instrument, updateInstrumentCalldata);

    assert lastReverted;
}

rule updateInstrumentChecksFunctionCallIsValid() {
    address instrument;
    bytes updateInstrumentCalldata;

    require instrument == fiol;
    require fiol.updateInstrumentSelector() != getBytes4(updateInstrumentCalldata);

    env e;
    updateInstrument@withrevert(e, instrument, updateInstrumentCalldata);

    assert lastReverted;
}
