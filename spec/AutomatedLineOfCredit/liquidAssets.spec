import "AutomatedLineOfCredit.spec"
import "unpaidFee.spec"

use invariant unpaidFeeOrVirtualTokenBalanceIsZero

// timeout
// invariant liquidAssetsEqualsVirtualTokenBalanceAfterUpdate(env e1)
//     (lastUpdateTimeGhost == e1.block.timestamp)
//     => 
//     (liquidAssets(e1) == virtualTokenBalance())
//     filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }

// timeout
// invariant liquidAssetsLTETotalAssets(env e1, env e2)
//     (e1.block.timestamp == e2.block.timestamp)
//     =>
//     (liquidAssets(e1) <= totalAssets(e2))
//     filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }

// timeout
// rule liquidAssetsEqualsTotalAssetsMinusTotalDebt() {
//     uint256 timestamp;

//     env e1;
//     require e1.block.timestamp == timestamp;
//     uint256 totalAssets = totalAssets(e1);

//     env e2;
//     require e2.block.timestamp == timestamp;
//     uint256 totalDebt = totalDebt(e1);

//     require totalAssets >= totalDebt;

//     env e3;
//     require e3.block.timestamp == timestamp;
//     assert liquidAssets(e1) == totalAssets - totalDebt;
// }

rule liquidAssetsIncreaseOnRepay() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    repay(e2, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    require liquidAssets_new != liquidAssets_old;

    assert liquidAssets_new > liquidAssets_old;
}

rule liquidAssetsIncreaseOnRepayInFull() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    repayInFull(e2);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    require liquidAssets_new != liquidAssets_old;

    assert liquidAssets_new > liquidAssets_old;
}

rule liquidAssetsDecreasesOnBorrow() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    borrow(e2, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    assert liquidAssets_new < liquidAssets_old;
}

// timeout
// rule liquidAssetsDecreaseOverTime() {
//     env e1;
//     env e2;
//     require e1.block.timestamp < e2.block.timestamp;
    
//     mathint difference = liquidAssets(e2) - liquidAssets(e1);

//     require difference != 0;

//     assert difference < 0;
// }

rule liquidAssetsIncreasesOnDeposit() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    deposit(e2, _, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    require liquidAssets_new != liquidAssets_old;

    assert liquidAssets_new > liquidAssets_old;
}

rule liquidAssetsIncreasesOnMint() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;
    requireInvariant unpaidFeeOrVirtualTokenBalanceIsZero();

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    mint(e2, _, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    require liquidAssets_new != liquidAssets_old;

    assert liquidAssets_new > liquidAssets_old;
}

rule liquidAssetsDecreasesOnWithdraw() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    withdraw(e2, _, _, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    assert liquidAssets_new < liquidAssets_old;
}

rule liquidAssetsDecreasesOnRedeem() {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    redeem(e2, _, _, _);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    assert liquidAssets_new < liquidAssets_old;
}

rule onlyThoseFunctionsChangeLiquidAssets(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    uint256 timestamp;
    require lastUpdateTimeGhost == timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 liquidAssets_old = liquidAssets(e1);

    env e2;
    require e2.block.timestamp == timestamp;
    callFunction(f, e2);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 liquidAssets_new = liquidAssets(e3);

    ifEffectThenFunction(
        liquidAssets_new != liquidAssets_old,
        f.selector == repay(uint256).selector ||
        f.selector == repayInFull().selector ||
        f.selector == borrow(uint256).selector ||
        f.selector == deposit(uint256,address).selector ||
        f.selector == mint(uint256,address).selector ||
        f.selector == withdraw(uint256,address,address).selector ||
        f.selector == redeem(uint256,address,address).selector
    );
    assert true;
}
