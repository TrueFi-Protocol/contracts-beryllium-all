import "AutomatedLineOfCredit.spec"

invariant unpaidFeeOrVirtualTokenBalanceIsZero()
    (unpaidFee() == 0) || (virtualTokenBalance() == 0)
    filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }
