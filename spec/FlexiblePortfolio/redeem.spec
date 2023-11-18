import "FlexiblePortfolio.spec"

rule redeemChecksAssetsArePositive() {
    uint256 shares;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 assets;
    require e1.msg.sender == currentContract;
    assets, _ = withdrawController.onRedeem(e1, sender, shares, receiver, owner);

    require assets <= 0;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    redeem@withrevert(e, shares, receiver, owner);

    assert lastReverted;
}

rule redeemChecksSharesArePositive() {
    uint256 shares;
    require shares <= 0;

    env e;
    redeem@withrevert(e, shares, _, _);

    assert lastReverted;
}

rule redeemChecksPortfolioIsNotTheReceiver() {
    address receiver;
    require receiver == currentContract;

    env e;
    redeem@withrevert(e, _, receiver, _);

    assert lastReverted;
}

rule redeemChecksPortfolioIsNotTheOwner() {
    address owner;
    require owner == currentContract;

    env e;
    redeem@withrevert(e, _, _, owner);

    assert lastReverted;
}

rule redeemChecksThatThereIsEnoughLiquidity() {
    uint256 shares;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 assets;
    uint256 redeemFee;
    require e2.msg.sender == currentContract;
    assets, redeemFee  = withdrawController.onRedeem(e2, sender, shares, receiver, owner);

    require assets + protocolFee + managerFee + redeemFee > virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    redeem@withrevert(e, shares, receiver, owner);

    assert lastReverted;
}

rule redeemChecksSenderHasEnoughAllowanceWhenSenderIsNotOwner() {
    uint256 shares;
    address owner;
    address sender;

    require owner != sender;
    require allowance(owner, sender) < shares;

    env e;
    require e.msg.sender == sender;
    redeem@withrevert(e, shares, _, owner);

    assert lastReverted;
}

rule redeemChecksOwnerHasEnoughShares() {
    uint256 shares;
    address receiver;
    address owner;

    require balanceOf(owner) < shares;

    env e;
    redeem@withrevert(e, shares, receiver, owner);

    assert lastReverted;
}

rule redeemTransfersAssetsToReceiver() {
    uint256 shares;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 assets;
    require e1.msg.sender == currentContract;
    assets, _  = withdrawController.onRedeem(e1, sender, shares, receiver, owner);

    require receiver != protocolConfig.protocolTreasury();
    require receiver != managerFeeBeneficiary();
    require receiver != currentContract;

    uint256 receiverBalance_old = token.balanceOf(receiver);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    redeem(e, shares, receiver, owner);

    uint256 receiverBalance_new = token.balanceOf(receiver);

    assert receiverBalance_new == receiverBalance_old + assets;
}

rule redeemPaysFeeToProtocol() {
    uint256 shares;
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
    redeem(e, shares, receiver, owner);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule redeemPaysFeeToManager() {
    uint256 shares;
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
    redeem(e, shares, receiver, owner);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

// timeout
// rule redeemChangesPortfolioBalance() {
//     uint256 shares;
//     address receiver;
//     address owner;
//     address sender;

//     env e1;
//     uint256 protocolFee;
//     uint256 managerFee;
//     _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

//     env e2;
//     uint256 assets;
//     uint256 redeemFee;
//     require e2.msg.sender == currentContract;
//     assets, redeemFee = withdrawStrategy.onRedeem(e2, sender, shares, receiver, owner);
    
//     uint256 totalBalance = virtualTokenBalance() - assets;
//     uint256 protocolFeePaid = min(protocolFee, totalBalance);
//     uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

//     require currentContract != protocolConfig.protocolTreasury();
//     require currentContract != managerFeeBeneficiary();
//     require currentContract != receiver;

//     uint256 portfolioBalance_old = token.balanceOf(currentContract);

//     env e;
//     require e.msg.sender == sender;
//     require e.block.timestamp == e1.block.timestamp;
//     require e.block.timestamp == e2.block.timestamp;
//     redeem(e, shares, receiver, owner);

//     uint256 portfolioBalance_new = token.balanceOf(currentContract);

//     assert portfolioBalance_new == portfolioBalance_old - assets - redeemFee - protocolFeePaid - managerFeePaid;
// }

rule redeemChangesVirtualTokenBalance() {
    uint256 shares;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 assets;
    uint256 redeemFee;
    require e2.msg.sender == currentContract;
    assets, redeemFee = withdrawController.onRedeem(e2, sender, shares, receiver, owner);
    
    uint256 totalBalance = virtualTokenBalance() - assets;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    redeem(e, shares, receiver, owner);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == virtualTokenBalance_old - assets - redeemFee - protocolFeePaid - managerFeePaid;
}
