import "FlexiblePortfolio.spec"

// WARNING: Not safe to requireInvariant this
invariant tokenBalanceIsEqualVirtualTokenBalance()
    virtualTokenBalance() == token.balanceOf(currentContract)
    filtered { f -> !isProxyFunction(f) && !isHavocedFunction(f) && !f.isFallback} {
        preserved fundInstrument(address instrument, uint256 instrumentId) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require instrument == fiol;
            require fiol.recipient(instrumentId) != currentContract;
        }
        preserved cancelInstrument(address instrument, uint256 instrumentId) with (env e) {
            require instrument == fiol;
        }
        preserved markInstrumentAsDefaulted(address instrument, uint256 instrumentId) with (env e) {
            require instrument == fiol;
        }
        preserved repay(address instrument, uint256 instrumentId, uint256 assets) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require instrument == fiol;
            require e.msg.sender != currentContract;
        }
        preserved deposit(uint256 assets, address receiver) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require e.msg.sender != currentContract;
        }
        preserved mint(uint256 shares, address receiver) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require e.msg.sender != currentContract;
        }
        preserved {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
        }
    }

invariant tokenBalanceIsGTEVirtualTokenBalance()
    token.balanceOf(currentContract) >= virtualTokenBalance()
    filtered { f -> !isProxyFunction(f) && !isHavocedFunction(f) && !f.isFallback} {
        preserved fundInstrument(address instrument, uint256 instrumentId) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require instrument == fiol;
            require fiol.recipient(instrumentId) != currentContract;
        }
        preserved cancelInstrument(address instrument, uint256 instrumentId) with (env e) {
            require instrument == fiol;
        }
        preserved markInstrumentAsDefaulted(address instrument, uint256 instrumentId) with (env e) {
            require instrument == fiol;
        }
        preserved repay(address instrument, uint256 instrumentId, uint256 assets) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require instrument == fiol;
            require e.msg.sender != currentContract;
        }
        preserved deposit(uint256 assets, address receiver) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require e.msg.sender != currentContract;
        }
        preserved mint(uint256 shares, address receiver) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require e.msg.sender != currentContract;
        }
        preserved {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
        }
    }
