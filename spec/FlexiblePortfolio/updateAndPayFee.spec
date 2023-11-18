import "FlexiblePortfolio.spec"

rule updateAndPayFeePaysFeeToProtocol() {
    env e1;
    uint256 protocolFee;
    _, protocolFee, _  = getTotalAssetsAndFeeHarness(e1);

    require protocolConfig.protocolTreasury() != currentContract;
    require protocolConfig.protocolTreasury() != managerFeeBeneficiary();

    uint256 protocolBalance_old = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_old = unpaidProtocolFee();

    env e;
    require e.block.timestamp == e1.block.timestamp;
    updateAndPayFee(e);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule updateAndPayFeePaysFeeToManager() {
    env e1;
    uint256 managerFee;
    _, _, managerFee  = getTotalAssetsAndFeeHarness(e1);

    require managerFeeBeneficiary() != currentContract;
    require managerFeeBeneficiary() != protocolConfig.protocolTreasury();

    uint256 managerBalance_old = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_old = unpaidManagerFee();
    
    env e;
    require e.block.timestamp == e1.block.timestamp;
    updateAndPayFee(e);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

rule updateAndPayFeeDecreasesVirtualTokenBalance() {
    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    uint256 virtualTokenBalance_old = virtualTokenBalance();
    uint256 protocolFeePaid = min(protocolFee, virtualTokenBalance_old);
    uint256 managerFeePaid = min(managerFee, virtualTokenBalance_old - protocolFeePaid);

    env e;
    require e.block.timestamp == e1.block.timestamp;
    updateAndPayFee(e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == virtualTokenBalance_old - protocolFeePaid - managerFeePaid;
}

rule updateAndPayFeeSetsLastUpdateTime() {
    env e;
    updateAndPayFee(e);

    assert lastUpdateTimeHarness() == e.block.timestamp;
}

rule updateAndPayFeeSetsLastProtocolFeeRate() {
    uint256 protocolFeeRate_new = protocolConfig.protocolFeeRate();

    env e;
    updateAndPayFee(e);

    assert lastProtocolFeeRate() == protocolFeeRate_new;
}

rule updateAndPayFeeSetsLastManagerFeeRate() {
    uint256 managerFeeRate_new = feeStrategy.managerFeeRate();

    env e;
    updateAndPayFee(e);

    assert lastManagerFeeRate() == managerFeeRate_new;
}
