import "AutomatedLineOfCredit.spec"

rule setWithdrawControllerChecksCallerHasManagerRole() {
    env e;
    require !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    setWithdrawController@withrevert(e, _);

    assert lastReverted;
}

rule setWithdrawControllerChecksNewWithdrawControllerIsDifferentThanOldWithdrawController() {
    address _withdrawController;

    require _withdrawController == withdrawController();

    env e;
    setWithdrawController@withrevert(e, _withdrawController);

    assert lastReverted;
}

rule setWithdrawControllerSetsWithdrawController() {
    address _withdrawController;

    env e;
    setWithdrawController(e, _withdrawController);

    assert withdrawController() == _withdrawController;
}

rule setWithdrawControllerChangesWithdrawController() {
    address withdrawController_old = withdrawController();

    env e;
    setWithdrawController(e, _);

    address withdrawController_new = withdrawController();

    assert withdrawController_old != withdrawController_new;
}

rule onlySetWithdrawControllerChangesWithdrawController(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    address withdrawController_old = withdrawController();

    env e;
    callFunction(f, e);

    address withdrawController_new = withdrawController();

    ifEffectThenFunction(
        withdrawController_new != withdrawController_old,
        f.selector == setWithdrawController(address).selector
    );
    assert true;
}

rule setWithdrawControllerNeverRevertsWhenConditionsMet() {
    address _withdrawController;
    address withdrawController_old = withdrawController();

    env e;
    require e.msg.value == 0;
    setWithdrawController@withrevert(e, _withdrawController);

    assert lastReverted <=> (
        !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender) ||
        _withdrawController == withdrawController_old
    );
}
