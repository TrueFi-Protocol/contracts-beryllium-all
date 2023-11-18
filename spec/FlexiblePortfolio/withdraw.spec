import "FlexiblePortfolio.spec"

rule withdrawChecksAssetsArePositive() {
    uint256 assets;
    require assets <= 0;

    env e;
    withdraw@withrevert(e, assets, _, _);

    assert lastReverted;
}

rule withdrawChecksSharesArePositive() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 shares;
    require e1.msg.sender == currentContract;
    shares, _ = withdrawController.onWithdraw(e1, sender, assets, receiver, owner);

    require shares <= 0;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    withdraw@withrevert(e, assets, receiver, owner);

    assert lastReverted;
}

rule withdrawChecksPortfolioIsNotTheReceiver() {
    address receiver;
    require receiver == currentContract;

    env e;
    withdraw@withrevert(e, _, receiver, _);

    assert lastReverted;
}

rule withdrawChecksPortfolioIsNotTheOwner() {
    address owner;
    require owner == currentContract;

    env e;
    withdraw@withrevert(e, _, _, owner);

    assert lastReverted;
}

rule withdrawChecksThatThereIsEnoughLiquidity() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 withdrawFee;
    require e2.msg.sender == currentContract;
    _, withdrawFee  = withdrawController.onWithdraw(e2, sender, assets, receiver, owner);

    require assets + protocolFee + managerFee + withdrawFee > virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    withdraw@withrevert(e, assets, receiver, owner);

    assert lastReverted;
}

rule withdrawChecksSenderHasEnoughAllowanceWhenSenderIsNotOwner() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 shares;
    require e1.msg.sender == currentContract;
    shares, _  = withdrawController.onWithdraw(e1, sender, assets, receiver, owner);

    require owner != sender;
    require allowance(owner, sender) < shares;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    withdraw@withrevert(e, assets, receiver, owner);

    assert lastReverted;
}

rule withdrawChecksOwnerHasEnoughShares() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 shares;
    require e1.msg.sender == currentContract;
    shares, _  = withdrawController.onWithdraw(e1, sender, assets, receiver, owner);

    require balanceOf(owner) < shares;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    withdraw@withrevert(e, assets, receiver, owner);

    assert lastReverted;
}

rule withdrawTransfersAssetsToReceiver() {
    uint256 assets;
    address receiver;

    require receiver != protocolConfig.protocolTreasury();
    require receiver != managerFeeBeneficiary();

    uint256 receiverBalance_old = token.balanceOf(receiver);

    env e;
    withdraw(e, assets, receiver, _);

    uint256 receiverBalance_new = token.balanceOf(receiver);

    assert receiverBalance_new == receiverBalance_old + assets;
}

rule withdrawPaysFeeToProtocol() {
    uint256 assets;
    address receiver;
    address owner;

    env e1;
    uint256 protocolFee;
    _, protocolFee, _  = getTotalAssetsAndFeeHarness(e1);

    require protocolConfig.protocolTreasury() != managerFeeBeneficiary();
    require protocolConfig.protocolTreasury() != currentContract;
    require protocolConfig.protocolTreasury() != receiver;

    uint256 protocolBalance_old = token.balanceOf(protocolConfig.protocolTreasury());

    env e;
    require e.block.timestamp == e1.block.timestamp;
    withdraw(e, assets, receiver, owner);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule withdrawPaysFeeToManager() {
    uint256 assets;
    address receiver;
    address owner;

    env e1;
    uint256 managerFee;
    _, _, managerFee  = getTotalAssetsAndFeeHarness(e1);

    require managerFeeBeneficiary() != protocolConfig.protocolTreasury();
    require managerFeeBeneficiary() != currentContract;
    require managerFeeBeneficiary() != receiver;

    uint256 managerBalance_old = token.balanceOf(managerFeeBeneficiary());

    env e;
    require e.block.timestamp == e1.block.timestamp;
    withdraw(e, assets, receiver, owner);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

rule withdrawChangesPortfolioBalance() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 withdrawFee;
    require e2.msg.sender == currentContract;
    _, withdrawFee = withdrawController.onWithdraw(e2, sender, assets, receiver, owner);
    
    uint256 totalBalance = virtualTokenBalance() - assets;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    require currentContract != protocolConfig.protocolTreasury();
    require currentContract != managerFeeBeneficiary();

    uint256 portfolioBalance_old = token.balanceOf(currentContract);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    withdraw(e, assets, receiver, owner);

    uint256 portfolioBalance_new = token.balanceOf(currentContract);

    assert portfolioBalance_new == portfolioBalance_old - assets - withdrawFee - protocolFeePaid - managerFeePaid;
}

rule withdrawChangesVirtualTokenBalance() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 withdrawFee;
    require e2.msg.sender == currentContract;
    _, withdrawFee = withdrawController.onWithdraw(e2, sender, assets, receiver, owner);
    
    uint256 totalBalance = virtualTokenBalance() - assets;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    withdraw(e, assets, receiver, owner);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == virtualTokenBalance_old - assets - withdrawFee - protocolFeePaid - managerFeePaid;
}
