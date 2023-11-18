import "../Shared.spec"

using MockToken as token
using ProtocolConfig as protocolConfig
using FixedInterestOnlyLoans as fiol
using FixedInterestOnlyLoansValuationStrategy as valuationStrategy
using DepositController as depositController
using WithdrawController as withdrawController
using FeeStrategy as feeStrategy

methods {
    BASIS_PRECISION() returns uint256 envfree
    MANAGER_ROLE() returns bytes32 envfree
    PAUSER_ROLE() returns bytes32 envfree
    CONTROLLER_ADMIN_ROLE() returns bytes32 envfree

    valuationStrategy() returns address envfree
    depositController() returns address envfree
    withdrawController() returns address envfree
    transferController() returns address envfree
    feeStrategy() returns address envfree

    allowance(address, address) returns uint256 envfree
    asset() returns address envfree
    balanceOf(address) returns uint256 envfree
    endDate() returns uint256 envfree
    getBytes4(bytes) returns bytes4 envfree
    hasRole(bytes32, address) returns bool envfree
    isInstrumentAllowed(address) returns bool envfree
    lastManagerFeeRate() returns uint256 envfree
    lastProtocolFeeRate() returns uint256 envfree
    managerFeeBeneficiary() returns address envfree
    maxSize() returns uint256 envfree
    totalSupply() returns uint256 envfree
    unpaidManagerFee() returns uint256 envfree
    unpaidProtocolFee() returns uint256 envfree
    virtualTokenBalance() returns uint256 envfree

    highestInstrumentEndDateHarness() returns uint256 envfree
    lastUpdateTimeHarness() returns uint256 envfree

    fiol.endDate(uint256) returns uint256 envfree
    fiol.issueInstrumentSelector() returns bytes4 envfree
    fiol.periodCount(uint256) returns uint16 envfree
    fiol.periodsRepaid(uint256) returns uint256 envfree
    fiol.principal(uint256) returns uint256 envfree
    fiol.recipient(uint256) returns address envfree
    fiol.status(uint256) returns uint8 envfree
    fiol.updateInstrumentSelector() returns bytes4 envfree

    feeStrategy.managerFeeRate() returns uint256 envfree

    protocolConfig.protocolTreasury() returns address envfree
    protocolConfig.protocolFeeRate() returns uint256 envfree

    token.allowance(address, address) returns uint256 envfree
    token.balanceOf(address) returns uint256 envfree

    _calculateLoanValue(uint256 instrumentId) returns uint256 => calculateLoanValueGhost(instrumentId)

    asset(uint256) returns address => DISPATCHER
    balanceOf(address) returns uint256 => DISPATCHER
    canTransfer(address, address, uint256) returns bool => DISPATCHER
    cancel(uint256) => DISPATCHER
    convertToShares(uint256) returns uint256 => DISPATCHER
    convertToAssets(uint256) returns uint256 => DISPATCHER
    endDate(uint256) returns uint256 => DISPATCHER
    liquidAssets() returns uint256 => DISPATCHER
    managerFeeRate() returns uint256 => DISPATCHER
    markAsDefaulted(uint256) => DISPATCHER
    maxSize() returns uint256 => DISPATCHER
    onERC721Received(address,address,uint256,bytes) => DISPATCHER
    onRedeem(address, uint256, address, address) returns (uint256, uint256) => DISPATCHER
    principal(uint256) returns uint256 => DISPATCHER
    recipient(uint256) returns address => DISPATCHER
    repay(uint256, uint256) returns (uint256, uint256) => DISPATCHER
    start(uint256) => DISPATCHER
    totalAssets() returns uint256 => DISPATCHER
    totalSupply() returns uint256 => DISPATCHER
    transfer(address, uint256) returns bool => DISPATCHER
    transferFrom(address, address, uint256) returns bool => DISPATCHER
    updateInstrumentSelector() returns bytes4 => DISPATCHER
    issueInstrumentSelector() returns bytes4 => DISPATCHER
}

// RULES

// FUNCTIONS

function callFunction(method f, env e) {
    calldataarg args;

    if (!f.isView && !isProxyFunction(f)) {
        if (f.isFallback) {
            f@withrevert(e, args);
        } else {
            f(e, args);
        }
    }
}

function callFunctionWithFIOL(method f, env e) {
    calldataarg args;

    if (!f.isView && !isProxyFunction(f)) {
        if (f.selector == repay(address,uint256,uint256).selector) {
            repay(e, fiol, _, _);
        }
        else if (f.selector == cancelInstrument(address,uint256).selector) {
            cancelInstrument(e, fiol, _);
        }
        else if (f.selector == fundInstrument(address,uint256).selector) {
            fundInstrument(e, fiol, _);
        }
        else if (f.selector == markInstrumentAsDefaulted(address,uint256).selector) {
            markInstrumentAsDefaulted(e, fiol, _);
        }
        // warning: dangerous to replace FP functions with FIOL counterparts
        // shouldn't be copied to future packages
        else if (f.selector == updateInstrument(address,bytes).selector) {
            fiol.updateInstrument(e, args);
        }
        // warning: same as above
        else if (f.selector == addInstrument(address,bytes).selector) {
            fiol.issueLoan(e, args);
        }
        else if (f.isFallback) {
            f@withrevert(e, args);
        } else {
            f(e, args);
        }
    }
}

function min(uint256 a, uint256 b) returns uint256 {
    if (a < b) {
        return a;
    } else {
        return b;
    }
}

// DEFINITIONS

definition isProxyFunction(method f) returns bool =
    f.selector == upgradeTo(address).selector ||
    f.selector == upgradeToAndCall(address,bytes).selector ||
    f.selector == initialize(address,uint256,address,address,uint256,(address,address,address,address,address),address[],(string,string)).selector;

definition isHarnessFunction(method f) returns bool =
    f.selector == getTotalAssetsAndFeeHarness().selector ||
    f.selector == highestInstrumentEndDateHarness().selector ||
    f.selector == lastUpdateTimeHarness().selector;

// These functions are using address(instrument).functionCall(args) syntax
// which is not supported by Certora and causes some invariants to always fail
definition isHavocedFunction(method f) returns bool =
    f.selector == updateInstrument(address,bytes).selector ||
    f.selector == addInstrument(address,bytes).selector;

// GHOSTS

ghost calculateLoanValueGhost(uint256) returns uint256;

ghost isInstrumentAddedGhost(address, uint256) returns bool;
hook Sstore isInstrumentAdded[KEY address instrument][KEY uint256 instrumentId] bool value STORAGE {
    havoc isInstrumentAddedGhost assuming forall address otherInstrument. forall uint256 otherInstrumentId. 
        otherInstrument == instrument && otherInstrumentId == instrumentId ? 
            isInstrumentAddedGhost@new(otherInstrument, otherInstrumentId) == value :
            isInstrumentAddedGhost@new(otherInstrument, otherInstrumentId) == isInstrumentAddedGhost@old(otherInstrument, otherInstrumentId);
}
hook Sload bool value isInstrumentAdded[KEY address instrument][KEY uint256 instrumentId] STORAGE {
    require value == isInstrumentAddedGhost(instrument, instrumentId);
}
