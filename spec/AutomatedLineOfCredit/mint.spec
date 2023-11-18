import "AutomatedLineOfCredit.spec"

rule mintChecksReceiverIsNotPortfolio() {
    address receiver;

    require receiver == currentContract;

    env e;
    mint@withrevert(e, _, receiver);

    assert lastReverted;
}

rule mintChecksPortfolioIsOpen() {
    uint256 timestamp;

    // Assuming no fees to be paid, times out without these assumptions
    require unpaidFee() == 0;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    require getStatus(e1) != STATUS_OPEN();

    env e2;
    require e2.block.timestamp == timestamp;
    mint@withrevert(e2, _, _);

    assert lastReverted;
}

rule mintChecksSharesArePositive() {
    uint256 shares = 0;

    env e;
    mint@withrevert(e, shares, _);

    assert lastReverted;
}

rule mintUpdatesPortfolio() {
    env e;
    mint(e, _, _);

    assert lastUpdateTimeGhost == e.block.timestamp;
}

rule mintMintsShares() {
    uint256 shares;
    address receiver;

    uint256 shares_old = balanceOf(receiver);
  
    env e;
    mint(e, shares, receiver);

    uint256 shares_new = balanceOf(receiver);

    assert shares_new == shares_old + shares;
}

rule mintTransfersAssetsFromSenderToPortfolio() {
    uint256 timestamp;

    // Assuming no fees to be paid
    require unpaidFee() == 0;
    require lastUpdateTimeGhost == timestamp;

    address sender;

    uint256 senderBalance_old = token.balanceOf(sender);
    uint256 portfolioBalance_old = token.balanceOf(currentContract);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == timestamp;
    mint(e, _, _);

    uint256 senderBalance_new = token.balanceOf(sender);
    uint256 portfolioBalance_new = token.balanceOf(currentContract);

    assert senderBalance_new < senderBalance_old;
    assert portfolioBalance_new > portfolioBalance_old;
}
