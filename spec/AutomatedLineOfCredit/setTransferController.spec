import "AutomatedLineOfCredit.spec"

rule setTransferControllerChecksCallerHasManagerRole() {
    env e;
    require !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    setTransferController@withrevert(e, _);

    assert lastReverted;
}

rule setTransferControllerChecksNewTransferControllerIsDifferentThanOldTransferController() {
    address _transferController;

    require _transferController == transferController();

    env e;
    setTransferController@withrevert(e, _transferController);

    assert lastReverted;
}

rule setTransferControllerSetsTransferController() {
    address _transferController;

    env e;
    setTransferController(e, _transferController);

    assert transferController() == _transferController;
}

rule setTransferControllerChangesTransferController() {
    address transferController_old = transferController();

    env e;
    setTransferController(e, _);

    address transferController_new = transferController();

    assert transferController_old != transferController_new;
}

rule onlySetTransferControllerChangesTransferController(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    address transferController_old = transferController();

    env e;
    callFunction(f, e);

    address transferController_new = transferController();

    ifEffectThenFunction(
        transferController_new != transferController_old,
        f.selector == setTransferController(address).selector
    );
    assert true;
}

rule setTransferControllerNeverRevertsWhenConditionsMet() {
    address _transferController;
    address transferController_old = transferController();

    env e;
    require e.msg.value == 0;
    setTransferController@withrevert(e, _transferController);

    assert lastReverted <=> (
        !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender) ||
        _transferController == transferController_old
    );
}
