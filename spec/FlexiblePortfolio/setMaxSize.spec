import "FlexiblePortfolio.spec"

rule setMaxSizeChecksCallerHasManagerRole() {
    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    setMaxSize@withrevert(e, _);

    assert lastReverted;
}

rule setMaxSizeChecksNewMaxSizeIsDifferentThanOldMaxSize() {
    uint256 _maxSize;

    require _maxSize == maxSize();

    env e;
    setMaxSize@withrevert(e, _maxSize);

    assert lastReverted;
}

rule setMaxSizeSetsMaxSize() {
    uint256 _maxSize;

    env e;
    setMaxSize(e, _maxSize);

    assert maxSize() == _maxSize;
}

rule setMaxSizeChangesMaxSize() {
    uint256 maxSize_old = maxSize();

    env e;
    setMaxSize(e, _);

    uint256 maxSize_new = maxSize();

    assert maxSize_old != maxSize_new;
}

rule onlySetMaxSizeChangesMaxSize(method f) {
    uint256 maxSize_old = maxSize();

    env e;
    callFunction(f, e);

    uint256 maxSize_new = maxSize();

    ifEffectThenFunction(
        maxSize_new != maxSize_old,
        f.selector == setMaxSize(uint256).selector
    );
    assert true;
}

rule setMaxSizeNeverRevertsWhenConditionsMet() {
    uint256 _maxSize;
    uint256 maxSize_old = maxSize();

    env e;
    require e.msg.value == 0;
    setMaxSize@withrevert(e, _maxSize);

    assert lastReverted <=> (
        !hasRole(MANAGER_ROLE(), e.msg.sender) ||
        _maxSize == maxSize_old
    );
}
