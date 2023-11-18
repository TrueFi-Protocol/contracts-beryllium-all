import "FlexiblePortfolio.spec"

rule mintChecksAssetsArePositive() {
    uint256 shares;
    address receiver;
    address sender;

    env e1;
    uint256 assets;
    require e1.msg.sender == currentContract;
    assets, _ = depositController.onMint(e1, sender, shares, receiver);

    require assets <= 0;

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    mint@withrevert(e, shares, receiver);

    assert lastReverted;
}

rule mintChecksSharesArePositive() {
    uint256 shares;
    require shares <= 0;

    env e;
    mint@withrevert(e, shares, _);

    assert lastReverted;
}

// timeout
// rule mintChecksThatPortfolioIsNotFull() {
//     uint256 shares;
//     address receiver;
//     address sender;

//     env e1;
//     uint256 totalAssets;
//     totalAssets, _, _ = getTotalAssetsAndFeeHarness(e1);

//     env e2;
//     uint256 assets;
//     require e2.msg.sender == currentContract;
//     assets, _ = depositStrategy.onMint(e2, sender, shares, receiver);
//     require totalAssets + assets > maxSize();

//     env e;
//     require e.msg.sender == sender;
//     require e.block.timestamp == e1.block.timestamp;
//     require e.block.timestamp == e2.block.timestamp;
//     mint@withrevert(e, shares, receiver);

//     assert lastReverted;
// }

rule mintChecksTimestampIsBeforePortfolioEndDate() {
    env e;
    require e.block.timestamp >= endDate();
    mint@withrevert(e, _, _);

    assert lastReverted;
}

rule mintChecksPortfolioIsNotTheReceiver() {
    address receiver;
    require receiver == currentContract;

    env e;
    mint@withrevert(e, _, receiver);

    assert lastReverted;
}

rule mintTakesAssetsFromSender() {
    uint256 shares;
    address receiver;
    address sender;

    env e1;
    uint256 assets;
    uint256 mintFee;
    require e1.msg.sender == currentContract;
    assets, mintFee = depositController.onMint(e1, sender, shares, receiver);

    require sender != currentContract;
    require sender != protocolConfig.protocolTreasury();
    require sender != managerFeeBeneficiary();

    uint256 senderBalance_old = token.balanceOf(sender);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    mint(e, shares, receiver);

    uint256 senderBalance_new = token.balanceOf(sender);

    assert senderBalance_new == senderBalance_old - assets - mintFee;
}

rule mintPaysFeeToProtocol() {
    uint256 shares;
    address receiver;

    env e1;
    uint256 protocolFee;
    _, protocolFee, _  = getTotalAssetsAndFeeHarness(e1);

    require protocolConfig.protocolTreasury() != currentContract;
    require protocolConfig.protocolTreasury() != managerFeeBeneficiary();

    uint256 protocolBalance_old = token.balanceOf(protocolConfig.protocolTreasury());

    env e;
    require protocolConfig.protocolTreasury() != e.msg.sender;
    require e.block.timestamp == e1.block.timestamp;
    mint(e, shares, receiver);

    uint256 protocolBalance_new = token.balanceOf(protocolConfig.protocolTreasury());
    uint256 unpaidProtocolFee_new = unpaidProtocolFee();

    assert protocolBalance_new + unpaidProtocolFee_new == protocolBalance_old + protocolFee;
}

rule mintPaysFeeToManager() {
    uint256 shares;
    address receiver;

    env e1;
    uint256 managerFee;
    _, _, managerFee  = getTotalAssetsAndFeeHarness(e1);

    require managerFeeBeneficiary() != currentContract;
    require managerFeeBeneficiary() != protocolConfig.protocolTreasury();

    uint256 managerBalance_old = token.balanceOf(managerFeeBeneficiary());

    env e;
    require managerFeeBeneficiary() != e.msg.sender;
    require e.block.timestamp == e1.block.timestamp;
    mint(e, shares, receiver);

    uint256 managerBalance_new = token.balanceOf(managerFeeBeneficiary());
    uint256 unpaidManagerFee_new = unpaidManagerFee();

    assert managerBalance_new + unpaidManagerFee_new == managerBalance_old + managerFee;
}

rule mintChangesPortfolioBalance() {
    uint256 shares;
    address receiver;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 assets;
    uint256 mintFee;
    require e2.msg.sender == currentContract;
    assets, mintFee = depositController.onMint(e2, sender, shares, receiver);

    uint256 totalBalance = virtualTokenBalance() + assets + mintFee;
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
    mint(e, shares, receiver);

    uint256 portfolioBalance_new = token.balanceOf(currentContract);

    assert portfolioBalance_new == portfolioBalance_old + assets - protocolFeePaid - managerFeePaid;
}

rule mintChangesVirtualTokenBalance() {
    uint256 shares;
    address receiver;
    address sender;

    env e1;
    uint256 protocolFee;
    uint256 managerFee;
    _, protocolFee, managerFee  = getTotalAssetsAndFeeHarness(e1);

    env e2;
    uint256 assets;
    uint256 mintFee;
    require e2.msg.sender == currentContract;
    assets, mintFee = depositController.onMint(e2, sender, shares, receiver);

    uint256 totalBalance = virtualTokenBalance() + assets + mintFee;
    uint256 protocolFeePaid = min(protocolFee, totalBalance);
    uint256 managerFeePaid = min(managerFee, totalBalance - protocolFeePaid);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    require e.block.timestamp == e2.block.timestamp;
    mint(e, shares, receiver);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new == virtualTokenBalance_old + assets - protocolFeePaid - managerFeePaid;
}
