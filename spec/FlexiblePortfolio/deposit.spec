import "FlexiblePortfolio.spec"

rule depositChecksFeeDoesntExceedAssets() {
    uint256 assets;
    address receiver;
    address sender;

    env e1;
    uint256 depositFee;
    require e1.msg.sender == currentContract;
    _, depositFee  = depositController.onDeposit(e1, sender, assets, receiver);
    require depositFee > assets;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    deposit@withrevert(e, assets, receiver);

    assert lastReverted;
}

rule depositChecksThatPortfolioIsNotFull() {
    uint256 assets;
    address receiver;
    address sender;

    env e1;
    uint256 totalAssets;
    totalAssets, _, _ = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 depositFee;
    require e2.msg.sender == currentContract;
    _, depositFee  = depositController.onDeposit(e2, sender, assets, receiver);
    uint256 depositedAssets = assets - depositFee;

    require totalAssets + depositedAssets > maxSize();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    deposit@withrevert(e, assets, receiver);

    assert lastReverted;
}

rule depositChecksTimestampIsBeforePortfolioEndDate() {
    env e;
    require e.block.timestamp >= endDate();
    deposit@withrevert(e, _, _);

    assert lastReverted;
}

rule depositChecksPortfolioIsNotTheReceiver() {
    address receiver;
    require receiver == currentContract;

    env e;
    deposit@withrevert(e, _, receiver);

    assert lastReverted;
}

rule depositChecksDepositedAssetsArePositive() {
    uint256 assets;
    address receiver;
    address sender;

    env e1;
    uint256 depositFee;
    require e1.msg.sender == currentContract;
    _, depositFee = depositController.onDeposit(e1, sender, assets, receiver);
    uint256 depositedAssets = assets - depositFee;

    require depositedAssets <= 0;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    deposit@withrevert(e, assets, receiver);

    assert lastReverted;
}

rule depositChecksSharesArePositive() {
    uint256 assets;
    address receiver;
    address sender;

    env e1;
    uint256 shares;
    require e1.msg.sender == currentContract;
    shares, _ = depositController.onDeposit(e1, sender, assets, receiver);

    require shares <= 0;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    deposit@withrevert(e, assets, receiver);

    assert lastReverted;
}

rule depositTakesAssetsFromSender() {
    uint256 assets;
    address receiver;
    address sender;

    require sender != currentContract;
    require sender != protocolConfig.protocolTreasury();
    require sender != managerFeeBeneficiary();

    uint256 senderBalance_old = token.balanceOf(sender);

    env e;
    require e.msg.sender == sender;
    deposit(e, assets, receiver);

    uint256 senderBalance_new = token.balanceOf(sender);

    assert senderBalance_new == senderBalance_old - assets;
}

rule depositPaysFeeToProtocol() {
    uint256 assets;
    address receiver;

    env e1;
    uint256 protocolFee;
    _, protocolFee, _  = getTotalAssetsAndFeeHarness(e1);

    require protocolConfig.protocolTreasury() != managerFeeBeneficiary();
    require protocolConfig.protocolTreasury() != currentContract;

    uint256 protocolBalance_old = token.balanceOf(protocolConfig.protocolTreasury());

    env e;
    require protocolConfig.protocolTreasury() != e.msg.sender;
    require e.block.timestamp == e1.block.timestamp;
    deposit(e, assets, receiver);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule depositPaysFeeToManager() {
    uint256 assets;
    address receiver;

    env e1;
    uint256 managerFee;
    _, _, managerFee  = getTotalAssetsAndFeeHarness(e1);

    require managerFeeBeneficiary() != protocolConfig.protocolTreasury();
    require managerFeeBeneficiary() != currentContract;

    uint256 managerBalance_old = token.balanceOf(managerFeeBeneficiary());

    env e;
    require managerFeeBeneficiary() != e.msg.sender;
    require e.block.timestamp == e1.block.timestamp;
    deposit(e, assets, receiver);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

rule depositChangesPortfolioBalance() {
    uint256 assets;
    address receiver;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 depositFee;
    require e2.msg.sender == currentContract;
    _, depositFee = depositController.onDeposit(e2, sender, assets, receiver);
    
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
    require e.block.timestamp == e2.block.timestamp;
    deposit(e, assets, receiver);

    uint256 portfolioBalance_new = token.balanceOf(currentContract);

    assert portfolioBalance_new == portfolioBalance_old + assets - depositFee - protocolFeePaid - managerFeePaid;
}

rule depositChangesVirtualTokenBalance() {
    uint256 assets;
    address receiver;
    address sender;

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 depositFee;
    require e2.msg.sender == currentContract;
    _, depositFee = depositController.onDeposit(e2, sender, assets, receiver);

    uint256 totalBalance = virtualTokenBalance() + assets;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    deposit(e, assets, receiver);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == virtualTokenBalance_old + assets - depositFee - protocolFeePaid - managerFeePaid;
}
