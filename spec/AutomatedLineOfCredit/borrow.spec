import "AutomatedLineOfCredit.spec"
import "unpaidFee.spec"

use invariant unpaidFeeOrVirtualTokenBalanceIsZero

rule borrowChecksSenderIsBorrower() {
    env e;
    require e.msg.sender != borrower();
    borrow@withrevert(e, _);

    assert lastReverted;
}

rule borrowChecksBorrowerIsNotALOC() {
    env e;
    require e.msg.sender == currentContract;
    borrow@withrevert(e, _);

    assert lastReverted;
}

rule borrowChecksTimestampIsBeforeEndDate() {
    env e;
    require e.block.timestamp >= endDate();
    borrow@withrevert(e, _);

    assert lastReverted;
}

// Does not include fees due to timeout
rule borrowChecksAssetsAreAvailable() {
    uint256 amount;

    require amount > virtualTokenBalance();

    env e;
    borrow@withrevert(e, amount);

    assert lastReverted;
}

rule borrowChecksAmountIsNonZero() {
    uint256 amount = 0;

    env e;
    borrow@withrevert(e, amount);

    assert lastReverted;
}

rule borrowUpdatesAccruedFee() {
    env e1;
    borrow(e1, _);

    env e2;
    require e2.block.timestamp == e1.block.timestamp;
    assert getFee(e2) == unpaidFee();
}

rule borrowIncreasesBorrowedAmount() {
    uint256 amount;

    uint256 borrowedAmount_old = borrowedAmount();

    env e;
    borrow(e, amount);

    uint256 borrowedAmount_new = borrowedAmount();

    assert borrowedAmount_new == borrowedAmount_old + amount;
}

rule onlyBorrowIncreasesBorrowedAmount(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    uint256 borrowedAmount_old = borrowedAmount();

    env e;
    callFunction(f, e);

    uint256 borrowedAmount_new = borrowedAmount();

    ifEffectThenFunction(
        borrowedAmount_new > borrowedAmount_old,
        f.selector == borrow(uint256).selector
    );
    assert true;
}

rule borrowDecreasesVirtualTokenBalance() {
    uint256 amount;

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    borrow(e, amount);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new <= virtualTokenBalance_old - amount;
}

rule onlyBorrowWithdrawAndRedeemDecreaseVirtualTokenBalance(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    uint256 timestamp;
    // Assuming no fee accruing
    require lastUpdateTimeGhost == timestamp;
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.block.timestamp == timestamp;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    ifEffectThenFunction(
        virtualTokenBalance_new < virtualTokenBalance_old,
        f.selector == borrow(uint256).selector ||
        f.selector == withdraw(uint256,address,address).selector ||
        f.selector == redeem(uint256,address,address).selector
    );
    assert true;
}

rule borrowTransfersTokensFromALOCToBorrower() {
    uint256 amount;

    require borrower() != protocolConfig.protocolTreasury();

    uint256 alocTokenBalance_old = token.balanceOf(currentContract);
    uint256 borrowerTokenBalance_old = token.balanceOf(borrower());

    env e;
    borrow(e, amount);

    uint256 alocTokenBalance_new = token.balanceOf(currentContract);
    uint256 borrowerTokenBalance_new = token.balanceOf(borrower());

    assert alocTokenBalance_new <= alocTokenBalance_old - amount;
    assert borrowerTokenBalance_new == borrowerTokenBalance_old + amount;
}


