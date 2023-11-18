import "AutomatedLineOfCredit.spec"

invariant virtualTokenBalanceIsLTETokenBalance()
    virtualTokenBalance() <= token.balanceOf(currentContract)
    filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }
    {
        preserved with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
        }
    }

// warning: not safe to require
invariant virtualTokenBalanceEqualsTokenBalance()
    virtualTokenBalance() == token.balanceOf(currentContract)
    filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }
    {
        preserved with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
        }
    }
