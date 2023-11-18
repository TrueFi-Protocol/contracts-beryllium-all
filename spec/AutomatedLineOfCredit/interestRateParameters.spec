import "AutomatedLineOfCredit.spec"

function interestRateParametersAreMonotone() returns bool {
    uint32 y1; uint32 x1;
    uint32 y2; uint32 x2;
    uint32 y3; uint32 x3;
    y1, x1, y2, x2, y3, x3 = getInterestRateParameters();

    return y1 <= y2 &&
        y2 <= y3 &&
        x1 <= x2 &&
        x2 <= x3;
}

// timeout
// rule interestRateIsGTEMinInterestRate() {
//     require interestRateParametersAreMonotone();

//     uint32 minInterestRate;
//     minInterestRate, _, _, _, _, _ = getInterestRateParameters();

//     env e;
//     uint256 interestRate = interestRate(e);

//     assert interestRate >= minInterestRate;
// }

// timeout
// rule interestRateIsLTEMaxInterestRate() {
//     require interestRateParametersAreMonotone();

//     uint32 maxInterestRate;
//     _, _, _, _, maxInterestRate, _ = getInterestRateParameters();

//     env e;
//     uint256 interestRate = interestRate(e);

//     assert interestRate <= maxInterestRate;
// }

rule interestRateParametersCannotBeChanged(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    uint32 y1_old; uint32 x1_old;
    uint32 y2_old; uint32 x2_old;
    uint32 y3_old; uint32 x3_old;

    y1_old, x1_old, y2_old, x2_old, y3_old, x3_old = getInterestRateParameters();

    env e;
    callFunction(f, e);

    uint32 y1_new; uint32 x1_new;
    uint32 y2_new; uint32 x2_new;
    uint32 y3_new; uint32 x3_new;

    y1_new, x1_new, y2_new, x2_new, y3_new, x3_new = getInterestRateParameters();

    assert y1_new == y1_old &&
        x1_new == x1_old && 
        y2_new == y2_old &&
        x2_new == x2_old &&
        y3_new == y3_old &&
        x3_new == x3_old;
}
