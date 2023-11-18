import "FlexiblePortfolio.spec"

invariant unpaidFeeOrVirtualTokenBalanceIsZero()
    (unpaidProtocolFee() + unpaidManagerFee() == 0) || (virtualTokenBalance() == 0)
    filtered { f -> !isProxyFunction(f) && !f.isFallback }

invariant protocolFeeHasHigherPriorityThanManagerFee()
    (unpaidManagerFee() == 0) => (unpaidProtocolFee() == 0)
    filtered { f -> !isProxyFunction(f) && !f.isFallback } {
        preserved with (env e) {
            env e1;
            uint256 managerFee;
            _, _, managerFee  = getTotalAssetsAndFeeHarness(e1);
            require e.block.timestamp == e1.block.timestamp;
            require managerFee > 0;
        }
    }
