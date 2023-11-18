import "AutomatedLineOfCredit.spec"

rule setDepositControllerChecksCallerHasManagerRole() {
    env e;
    require !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    setDepositController@withrevert(e, _);

    assert lastReverted;
}

rule setDepositControllerChecksNewDepositControllerIsDifferentThanOldDepositController() {
    address _depositController;

    require _depositController == depositController();

    env e;
    setDepositController@withrevert(e, _depositController);

    assert lastReverted;
}

rule setDepositControllerSetsDepositController() {
    address _depositController;

    env e;
    setDepositController(e, _depositController);

    assert depositController() == _depositController;
}

rule setDepositControllerChangesDepositController() {
    address depositController_old = depositController();

    env e;
    setDepositController(e, _);

    address depositController_new = depositController();

    assert depositController_old != depositController_new;
}

rule onlySetDepositControllerChangesDepositController(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    address depositController_old = depositController();

    env e;
    callFunction(f, e);

    address depositController_new = depositController();

    ifEffectThenFunction(
        depositController_new != depositController_old,
        f.selector == setDepositController(address).selector
    );
    assert true;
}

rule setDepositControllerNeverRevertsWhenConditionsMet() {
    address _depositController;
    address depositController_old = depositController();

    env e;
    require e.msg.value == 0;
    setDepositController@withrevert(e, _depositController);

    assert lastReverted <=> (
        !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender) ||
        _depositController == depositController_old
    );
}
