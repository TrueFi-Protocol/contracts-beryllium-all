import "FlexiblePortfolio.spec"

rule setEndDateChecksCallerHasManagerRole() {
    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    setEndDate@withrevert(e, _);

    assert lastReverted;
}

rule setEndDateChecksEndDateDidntElapse() {
    env e;
    require endDate() <= e.block.timestamp;
    setEndDate@withrevert(e, _);

    assert lastReverted;
}

rule setEndDateChecksNewEndDateIsHigherThanBlockTimestamp() {
    uint256 newEndDate;
    
    env e;
    require newEndDate <= e.block.timestamp;
    setEndDate@withrevert(e, newEndDate);

    assert lastReverted;
}

rule setEndDateChecksNewEndDateIsLowerThanOldEndDate() {
    uint256 newEndDate;

    require newEndDate >= endDate();

    env e;
    setEndDate@withrevert(e, newEndDate);

    assert lastReverted;
}

rule setEndDateChecksNewEndDateIsHigherThanHighestInstrumentEndDate() {
    uint256 newEndDate;

    require newEndDate <= highestInstrumentEndDateHarness();

    env e;
    setEndDate@withrevert(e, newEndDate);

    assert lastReverted;
}

rule setEndDateSetsEndDate() {
    uint256 newEndDate;

    env e;
    setEndDate(e, newEndDate);

    assert endDate() == newEndDate;
}

rule onlySetEndDateChangesEndDate(method f) {
    uint256 endDate_old = endDate();

    env e;
    callFunction(f, e);

    uint256 endDate_new = endDate();

    ifEffectThenFunction(
        endDate_new != endDate_old,
        f.selector == setEndDate(uint256).selector
    );
    assert true;
}

rule setEndDateNeverRevertsWhenConditionsMet() {
    uint256 newEndDate;
    uint256 endDate_old = endDate();

    env e;
    require e.msg.value == 0;
    setEndDate@withrevert(e, newEndDate);

    assert lastReverted <=> (
        !hasRole(MANAGER_ROLE(), e.msg.sender) ||
        endDate() <= e.block.timestamp ||
        newEndDate <= e.block.timestamp ||
        newEndDate >= endDate_old || 
        newEndDate <= highestInstrumentEndDateHarness()
    );
}
