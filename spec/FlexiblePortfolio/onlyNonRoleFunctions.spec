import "FlexiblePortfolio.spec"

rule onlyNonManagerFunctionsCanBeCalledByNonManagerUsers(method f) filtered { f -> (!f.isView && !isProxyFunction(f) && !isHarnessFunction(f)) } {
    calldataarg args;
    
    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    
    f@withrevert(e, args);

    ifEffectThenFunction(
        !lastReverted,
        f.selector == mint(uint256,address).selector ||
        f.selector == repay(address,uint256,uint256).selector ||
        f.selector == deposit(uint256,address).selector ||
        f.selector == withdraw(uint256,address, address).selector ||
        f.selector == redeem(uint256,address,address).selector ||
        f.selector == transfer(address,uint256).selector ||
        f.selector == transferFrom(address,address,uint256).selector ||
        f.selector == updateAndPayFee().selector ||
        f.selector == approve(address,uint256).selector ||
        f.selector == grantRole(bytes32,address).selector ||
        f.selector == renounceRole(bytes32,address).selector ||
        f.selector == revokeRole(bytes32,address).selector ||
        f.selector == increaseAllowance(address,uint256).selector ||
        f.selector == decreaseAllowance(address,uint256).selector ||
        f.selector == setTransferController(address).selector ||
        f.selector == setWithdrawController(address).selector ||
        f.selector == setDepositController(address).selector ||
        f.selector == setValuationStrategy(address).selector ||
        f.selector == setFeeStrategy(address).selector ||
        f.selector == pause().selector ||
        f.selector == unpause().selector
    );
    assert true;
}

rule onlyNonRoleFunctionsCanBeCalledByNonRoleUsers(method f) filtered { f -> (!f.isView && !isProxyFunction(f) && !isHarnessFunction(f)) } {
    calldataarg args;

    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    require !hasRole(CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    require !hasRole(PAUSER_ROLE(), e.msg.sender);

    f@withrevert(e, args);

    ifEffectThenFunction(
        !lastReverted,
        f.selector == mint(uint256,address).selector ||
        f.selector == repay(address,uint256,uint256).selector ||
        f.selector == deposit(uint256,address).selector ||
        f.selector == withdraw(uint256,address, address).selector ||
        f.selector == redeem(uint256,address,address).selector ||
        f.selector == transfer(address,uint256).selector ||
        f.selector == transferFrom(address,address,uint256).selector ||
        f.selector == updateAndPayFee().selector ||
        f.selector == approve(address,uint256).selector ||
        f.selector == grantRole(bytes32,address).selector ||
        f.selector == renounceRole(bytes32,address).selector ||
        f.selector == revokeRole(bytes32,address).selector ||
        f.selector == increaseAllowance(address,uint256).selector ||
        f.selector == decreaseAllowance(address,uint256).selector
    );
    assert true;
}
