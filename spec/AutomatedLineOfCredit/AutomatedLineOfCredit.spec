import "../Shared.spec"

using MockToken as token
using ProtocolConfig as protocolConfig

methods {
    allowance(address, address) returns uint256 envfree
    balanceOf(address) returns uint256 envfree
    borrowedAmount() returns uint256 envfree
    borrower() returns address envfree
    depositController() returns address envfree
    endDate() returns uint256 envfree
    getRoleAdmin(bytes32) returns bytes32 envfree
    getInterestRateParameters() returns (uint32,uint32,uint32,uint32,uint32,uint32) envfree
    hasRole(bytes32, address) returns bool envfree
    lastProtocolFeeRate() returns uint256 envfree
    maxSize() returns uint256 envfree
    totalSupply() returns uint256 envfree
    transferController() returns address envfree
    unpaidFee() returns uint256 envfree
    virtualTokenBalance() returns uint256 envfree
    withdrawController() returns address envfree

    BASIS_PRECISION() returns uint256 envfree
    DEFAULT_ADMIN_ROLE() returns bytes32 envfree
    MANAGER_ROLE() returns bytes32 envfree
    CONTROLLER_ADMIN_ROLE() returns bytes32 envfree

    token.allowance(address, address) returns uint256 envfree
    token.balanceOf(address) returns uint256 envfree

    protocolConfig.protocolTreasury() returns address envfree
}

// RULES

rule functionsDisabledByStrategyCannotBeCalled(method f) filtered { f -> isDisabledByStrategy(f) } {
    env e;
    callFunctionWithRevert(f, e);

    assert lastReverted;
}

// FUNCTIONS

function callFunction(method f, env e) {
    calldataarg args;

    if (!f.isView && !isProxyFunction(f)) {
        if (f.isFallback || isDisabledByStrategy(f)) {
            f@withrevert(e, args);
        } else {
            f(e, args);
        }
    }
}

function callFunctionWithRevert(method f, env e) {
    calldataarg args;

    if (!f.isView && !isProxyFunction(f)) {
        f@withrevert(e, args);
    }
}

definition isDisabledByStrategy(method f) returns bool =
    f.selector == transfer(address,uint256).selector ||
    f.selector == transferFrom(address,address,uint256).selector;

definition isProxyFunction(method f) returns bool =
    f.selector == upgradeTo(address).selector ||
    f.selector == upgradeToAndCall(address,bytes).selector ||
    f.selector == initialize(address,uint256,address,address,uint256,(uint32,uint32,uint32,uint32,uint32,uint32),(address,address,address),string,string).selector;

// CONSTANTS

definition STATUS_OPEN() returns uint8 = 0;
definition STATUS_FULL() returns uint8 = 1;
definition STATUS_CLOSED() returns uint8 = 2;

// GHOSTS

ghost uint256 lastUpdateTimeGhost;

hook Sstore lastUpdateTime uint256 value STORAGE {
    lastUpdateTimeGhost = value;
}
hook Sload uint256 value lastUpdateTime STORAGE {
    require value == lastUpdateTimeGhost;
}

ghost _allowanceGhost(address, address) returns uint256;

hook Sstore _allowances[KEY address owner][KEY address spender] uint256 value STORAGE {
    havoc _allowanceGhost assuming 
        forall address _owner. 
        forall address _spender.
        (owner == _owner && spender == _spender) ? 
        _allowanceGhost@new(_spender, _owner) == value :
        _allowanceGhost@new(_spender, _owner) == _allowanceGhost@old(_spender, _owner);
}

hook Sload uint256 value _allowances[KEY address owner][KEY address spender] STORAGE {
    require value == _allowanceGhost(owner, spender);
}
