import "FlexiblePortfolio.spec"

rule repayChecksAmountIsGTZero() {
    uint256 assets;
    require assets <= 0;

    env e;
    repay@withrevert(e, _, _, assets);

    assert lastReverted;
}

rule repayChecksSenderIsInstrumentRecipient() {
    uint256 instrumentId;
    address recipient = fiol.recipient(instrumentId);

    env e;
    require recipient != e.msg.sender;
    repay@withrevert(e, fiol, instrumentId, _);

    assert lastReverted;
}

rule repayChecksInstrumentIsAdded() {
    address instrument;
    uint256 instrumentId;

    require !isInstrumentAddedGhost(instrument, instrumentId);

    env e;
    repay@withrevert(e, instrument, instrumentId, _);

    assert lastReverted;
}

rule repayTakesTokensFromRecipient() {
    uint256 assets;
    uint256 instrumentId;
    address recipient = fiol.recipient(instrumentId);

    require recipient != currentContract;
    require recipient != protocolConfig.protocolTreasury();
    require recipient != managerFeeBeneficiary();

    uint256 recipientBalance_old = token.balanceOf(recipient);

    env e;
    repay(e, fiol, instrumentId, assets);

    uint256 recipientBalance_new = token.balanceOf(recipient);

    assert recipientBalance_new == recipientBalance_old - assets;
}

rule repayPaysFeeToProtocol() {
    uint256 instrumentId;
    address recipient = fiol.recipient(instrumentId);

    env e1;
    uint256 protocolFee;
    _, protocolFee, _  = getTotalAssetsAndFeeHarness(e1);

    require protocolConfig.protocolTreasury() != currentContract;
    require protocolConfig.protocolTreasury() != recipient;
    require protocolConfig.protocolTreasury() != managerFeeBeneficiary();

    uint256 protocolBalance_old = token.balanceOf(protocolConfig.protocolTreasury());

    env e;
    require e.block.timestamp == e1.block.timestamp;
    repay(e, fiol, instrumentId, _);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule repayPaysFeeToManager() {
    uint256 instrumentId;
    address recipient = fiol.recipient(instrumentId);

    env e1;
    uint256 managerFee;
    _, _, managerFee  = getTotalAssetsAndFeeHarness(e1);

    require managerFeeBeneficiary() != currentContract;
    require managerFeeBeneficiary() != recipient;
    require managerFeeBeneficiary() != protocolConfig.protocolTreasury();

    uint256 managerBalance_old = token.balanceOf(managerFeeBeneficiary());

    env e;
    require e.block.timestamp == e1.block.timestamp;
    repay(e, fiol, instrumentId, _);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

rule repayChangesPortfolioBalance() {
    uint256 instrumentId;
    uint256 assets;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    uint256 totalBalance = virtualTokenBalance() + assets;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    require currentContract != protocolConfig.protocolTreasury();
    require currentContract != managerFeeBeneficiary();
    require currentContract != sender;

    uint256 portfolioBalance_old = token.balanceOf(currentContract);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    repay(e, fiol, instrumentId, assets);

    uint256 portfolioBalance_new = token.balanceOf(currentContract);

    assert portfolioBalance_new == portfolioBalance_old + assets - protocolFeePaid - managerFeePaid;
}

rule repayChangesVirtualTokenBalance() {
    uint256 instrumentId;
    uint256 assets;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    uint256 totalBalance = virtualTokenBalance() + assets;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.block.timestamp == e1.block.timestamp;
    repay(e, fiol, instrumentId, assets);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == totalBalance - protocolFeePaid - managerFeePaid;
}

// timeout
// rule repayChangesStatusToRepaidWhenAllPeriodsGotRepaid() {
//     uint256 instrumentId;

//     require fiol.periodsRepaid(instrumentId) == fiol.periodCount(instrumentId) - 1;

//     env e;
//     repay(e, fiol, instrumentId, _);    

//     assert fiol.status(instrumentId) == Repaid();
// }

rule onlyRepayChangesLoanStatusToRepaid(method f) {
    uint256 instrumentId;

    uint8 loanStatus_old = fiol.status(instrumentId);

    env e;
    callFunctionWithFIOL(f, e);

    uint8 loanStatus_new = fiol.status(instrumentId);

    ifEffectThenFunction(
        loanStatus_new != loanStatus_old && loanStatus_new == Repaid(),
        f.selector == repay(address, uint256, uint256).selector
    );
    assert true;
}
