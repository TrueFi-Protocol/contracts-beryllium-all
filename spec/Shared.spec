// Shared functions

function ifEffectThenFunction(bool isEffect, bool isFunction) {
    if (!isFunction) {
        assert !isEffect;
    } else {
        require isEffect; // This relies on vacuity check to verify that this reachable;
    }
}

// CONSTANTS

definition DAY() returns uint256 = 60 * 60 * 24;
definition YEAR() returns uint256 = 365 * DAY();

definition Started() returns uint8 = 2;
definition Repaid() returns uint8 = 3;
definition Canceled() returns uint8 = 4;
definition Defaulted() returns uint8 = 5;
