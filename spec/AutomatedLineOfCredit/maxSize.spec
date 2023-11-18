import "AutomatedLineOfCredit.spec"

// rule totalAssetsIsBelowMaxSizeAssumingNoInterest(method f) 
// filtered { f -> f.selector != setMaxSize(uint256).selector && !isProxyFunction(f) } {
//     uint256 timestamp;

//     env e1;
//     require e1.block.timestamp == timestamp;
//     require totalAssets(e1) <= maxSize();
    
//     env e2;
//     require e2.block.timestamp == timestamp;
//     require !hasRole(MANAGER_ROLE(), e2.msg.sender);
//     callFunction(f, e2);

//     env e3;
//     require e3.block.timestamp == timestamp;
//     require unincludedInterest(e3) == 0;

//     env e4;
//     require e4.block.timestamp == timestamp;
//     assert totalAssets(e4) <= maxSize();
// }

rule onlyManagerCanChangeMaxSize(method f)
filtered { f -> !isProxyFunction(f) } {
    uint256 maxSize_old = maxSize();

    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    callFunction(f, e);

    uint256 maxSize_new = maxSize();

    assert maxSize_new == maxSize_old;
}

// warning: not safe to assume
invariant virtualTokenBalancePlusBorrowedAmountLTEMaxSize()
    virtualTokenBalance() + borrowedAmount() <= maxSize()
    filtered { f -> 
        f.selector != repay(uint256).selector &&
        f.selector != repayInFull().selector &&
        f.selector != setMaxSize(uint256).selector && 
        !isProxyFunction(f) 
    }
