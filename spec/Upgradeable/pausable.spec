using AutomatedLineOfCredit as aloc
using FlexiblePortfolio as fp
using FlexiblePortfolioFactory as fpf

methods {
    getRoleAdmin(bytes32) returns bytes32 envfree
    hasRole(bytes32, address) returns bool envfree
    paused() returns bool envfree

    DEFAULT_ADMIN_ROLE() returns bytes32 envfree
    PAUSER_ROLE() returns bytes32 envfree

    aloc.MANAGER_ROLE() returns bytes32 envfree
    aloc.CONTROLLER_ADMIN_ROLE() returns bytes32 envfree
    fp.MANAGER_ROLE() returns bytes32 envfree
    fp.CONTROLLER_ADMIN_ROLE() returns bytes32 envfree
}

rule nonManagersCannotCallNonViewFunctionsWhenPaused(method f) filtered {
  f -> !f.isFallback 
    && !f.isView
    && !isProxyFunction(f)
    && !isHarnessFunction(f)
    && f.selector != renounceRole(bytes32,address).selector
} {
    bytes32 role;
    requireInvariant onlyManagerAndDefaultAdminAreRoleAdmins(role);
    require paused();

    calldataarg args;

    env e;
    require !hasRole(DEFAULT_ADMIN_ROLE(), e.msg.sender);
    require !hasRole(aloc.MANAGER_ROLE(), e.msg.sender);
    require !hasRole(aloc.CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    require !hasRole(fp.MANAGER_ROLE(), e.msg.sender);
    require !hasRole(fp.CONTROLLER_ADMIN_ROLE(), e.msg.sender);
    require !hasRole(PAUSER_ROLE(), e.msg.sender);
    callFunctionWithRevert(f, e, role);

    assert lastReverted;
}

rule pausedContractCanAlwaysBeUnpaused() {
    require paused();

    env e;
    require hasRole(PAUSER_ROLE(), e.msg.sender);
    require e.msg.value == 0;
    unpause@withrevert(e);

    assert !lastReverted;
}

invariant onlyManagerAndDefaultAdminAreRoleAdmins(bytes32 role)
    getRoleAdmin(role) == DEFAULT_ADMIN_ROLE() || getRoleAdmin(role) == aloc.MANAGER_ROLE() || getRoleAdmin(role) == fp.MANAGER_ROLE()
    filtered { f -> !isProxyFunction(f) && !isManuallyChecked(f) && !f.isFallback }

definition isManuallyChecked(method f) returns bool = false;

function callFunctionWithRevert(method f, env e, bytes32 role_optional) {
    if (f.selector == grantRole(bytes32,address).selector) {
        address target;
        grantRole@withrevert(e, role_optional, target);
    } else if (f.selector == revokeRole(bytes32,address).selector) {
        address target;
        revokeRole@withrevert(e, role_optional, target);
    } else {
        calldataarg args;
        f@withrevert(e, args);
    }
}

definition isProxyFunction(method f) returns bool =
    f.selector == upgradeTo(address).selector ||
    f.selector == upgradeToAndCall(address,bytes).selector ||
    f.selector == aloc.initialize(address,uint256,address,address,uint256,(uint32,uint32,uint32,uint32,uint32,uint32),(address,address,address),string,string).selector ||
    f.selector == fp.initialize(address,uint256,address,address,uint256,(address,address,address,address,address),address[],(string,string)).selector ||
    f.selector == fpf.initialize(address,address).selector;

definition isHarnessFunction(method f) returns bool = false;
