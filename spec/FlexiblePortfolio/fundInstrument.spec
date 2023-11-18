import "FlexiblePortfolio.spec"

rule fundInstrumentChecksCallerHasManagerRole() {
    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    fundInstrument@withrevert(e, _, _);

    assert lastReverted;
}

rule fundInstrumentChecksInstrumentIsAdded() {
    address instrument;
    uint256 instrumentId;

    require isInstrumentAddedGhost(instrument, instrumentId) == false;

    env e;
    fundInstrument@withrevert(e, instrument, instrumentId);

    assert lastReverted;
}

rule fundInstrumentChecksThatThereIsEnoughLiquidity() {
    uint256 instrumentId;
    uint256 principalAmount = fiol.principal(instrumentId);

    env e;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e);

    require principalAmount + protocolFee + managerFee > virtualTokenBalance();

    env e2;
    require e2.block.timestamp == e.block.timestamp;
    fundInstrument@withrevert(e2, fiol, instrumentId);

    assert lastReverted;
}

rule fundInstrumentSetsInstrumentStatusToStarted() {
    uint256 instrumentId;

    env e;
    fundInstrument(e, fiol, instrumentId);    

    assert fiol.status(instrumentId) == Started();
}

rule fundInstrumentChecksInstrumentEndDateIsBeforePortfolioEndDate() {
    uint256 instrumentId;
    storage initialState = lastStorage;

    env e;
    fiol.start(e, instrumentId);
    uint256 instrumentEndDate = fiol.endDate(instrumentId);

    require instrumentEndDate > endDate();

    env e2;
    require e2.block.timestamp == e.block.timestamp;
    fundInstrument@withrevert(e2, fiol, instrumentId) at initialState;

    assert lastReverted;
}

rule fundInstrumentUpdatesHighestInstrumentEndDate() {
    uint256 instrumentId;
    storage initialState = lastStorage;

    env e;
    fiol.start(e, instrumentId);
    uint256 instrumentEndDate = fiol.endDate(instrumentId);

    require instrumentEndDate > highestInstrumentEndDateHarness();

    env e2;
    require e2.block.timestamp == e.block.timestamp;
    fundInstrument(e2, fiol, instrumentId) at initialState;

    assert highestInstrumentEndDateHarness() == instrumentEndDate;
}

rule fundInstrumentTransfersTokensToBorrower() {
    uint256 instrumentId;
    address borrower = fiol.recipient(instrumentId);
    uint256 principalAmount = fiol.principal(instrumentId);

    require borrower != currentContract;
    require borrower != protocolConfig.protocolTreasury();
    require borrower != managerFeeBeneficiary();

    uint256 borrowerBalance_old = token.balanceOf(borrower);

    env e;
    fundInstrument(e, fiol, instrumentId);

    uint256 borrowerBalance_new = token.balanceOf(borrower);

    assert borrowerBalance_new == borrowerBalance_old + principalAmount;
}

rule fundInstrumentPaysFeeToProtocol() {
    uint256 instrumentId;
    address borrower = fiol.recipient(instrumentId);

    env e;
    uint256 protocolFee;
    _, protocolFee, _  = getTotalAssetsAndFeeHarness(e);

    require protocolConfig.protocolTreasury() != currentContract;
    require protocolConfig.protocolTreasury() != borrower;
    require protocolConfig.protocolTreasury() != managerFeeBeneficiary();

    uint256 protocolBalance_old = token.balanceOf(protocolConfig.protocolTreasury());

    env e2;
    require e2.block.timestamp == e.block.timestamp;
    fundInstrument(e2, fiol, instrumentId);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule fundInstrumentPaysFeeToManager() {
    uint256 instrumentId;
    address borrower = fiol.recipient(instrumentId);

    env e;
    uint256 managerFee;
    _, _, managerFee  = getTotalAssetsAndFeeHarness(e);

    require managerFeeBeneficiary() != currentContract;
    require managerFeeBeneficiary() != borrower;
    require managerFeeBeneficiary() != protocolConfig.protocolTreasury();

    uint256 managerBalance_old = token.balanceOf(managerFeeBeneficiary());
    
    env e2;
    require e2.block.timestamp == e.block.timestamp;
    fundInstrument(e2, fiol, instrumentId);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

rule fundInstrumentDecreasesVirtualTokenBalance() {
    uint256 instrumentId;
    uint256 principalAmount = fiol.principal(instrumentId);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e);

    env e2;
    require e2.block.timestamp == e.block.timestamp;
    fundInstrument(e2, fiol, instrumentId);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == virtualTokenBalance_old - principalAmount - protocolFee - managerFee;
}

rule fundInstrumentSetsLoanStatusToStarted() {
    uint256 instrumentId;

    env e;
    fundInstrument(e, fiol, instrumentId);

    assert fiol.status(instrumentId) == Started();
}

rule onlyFundInstrumentChangesLoanStatusToStarted(method f) {
    uint256 instrumentId;

    uint8 loanStatus_old = fiol.status(instrumentId);

    env e;
    callFunctionWithFIOL(f, e);

    uint8 loanStatus_new = fiol.status(instrumentId);

    ifEffectThenFunction(
        loanStatus_new != loanStatus_old && loanStatus_new == Started(),
        f.selector == fundInstrument(address, uint256).selector
    );
    assert true;
}
