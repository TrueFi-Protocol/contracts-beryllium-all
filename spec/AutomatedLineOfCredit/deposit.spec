import "AutomatedLineOfCredit.spec"

rule depositChecksReceiverIsNotPortfolio() {
    address receiver;

    require receiver == currentContract;

    env e;
    deposit@withrevert(e, _, receiver);

    assert lastReverted;
}

rule depositChecksPortfolioIsOpen() {
    uint256 timestamp;

    // Assuming no fees to be paid, times out without these assumptions
    require unpaidFee() == 0;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    require getStatus(e1) != STATUS_OPEN();

    env e2;
    require e2.block.timestamp == timestamp;
    deposit@withrevert(e2, _, _);

    assert lastReverted;
}

rule depositChecksAssetsArePositive() {
    uint256 assets = 0;

    env e;
    deposit@withrevert(e, assets, _);

    assert lastReverted;
}

rule depositChecksAssetsDontExceedMaxSize() {
    uint256 timestamp;

    // Assuming no fees to be paid, times out without these assumptions
    require unpaidFee() == 0;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 totalAssets = totalAssets(e1);

    uint256 assets;
    require totalAssets + assets > maxSize();

    env e2;
    require e2.block.timestamp == timestamp;
    deposit@withrevert(e2, assets, _);

    assert lastReverted;
}

rule depositUpdatesPortfolio() {
    env e;
    deposit(e, _, _);

    assert lastUpdateTimeGhost == e.block.timestamp;
}

rule depositMintsShares() {
    address receiver;

    uint256 shares_old = balanceOf(receiver);
  
    env e;
    deposit(e, _, receiver);

    uint256 shares_new = balanceOf(receiver);

    assert shares_new > shares_old;
}

rule depositTransfersAssetsFromSenderToPortfolio() {
    uint256 timestamp;

    // Assuming no fees to be paid
    require unpaidFee() == 0;
    require lastUpdateTimeGhost == timestamp;

    uint256 assets;
    address sender;

    uint256 senderBalance_old = token.balanceOf(sender);
    uint256 portfolioBalance_old = token.balanceOf(currentContract);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == timestamp;
    deposit(e, assets, _);

    uint256 senderBalance_new = token.balanceOf(sender);
    uint256 portfolioBalance_new = token.balanceOf(currentContract);

    assert senderBalance_new == senderBalance_old - assets;
    assert portfolioBalance_new == portfolioBalance_old + assets;
}
