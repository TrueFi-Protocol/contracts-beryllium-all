import "AutomatedLineOfCredit.spec"

rule borrowerCannotChange(method f)
filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) } {
    address borrower_old = borrower();

    env e;
    callFunction(f, e);

    address borrower_new = borrower();

    assert borrower_new == borrower_old;
}

invariant onlyDefaultAdminRoleIsManagerRoleAdmin()
    getRoleAdmin(MANAGER_ROLE()) == DEFAULT_ADMIN_ROLE()
    filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }

invariant onlyBorrowerIsManager(address manager)
    hasRole(MANAGER_ROLE(), manager) => manager == borrower()
    filtered { f -> !isProxyFunction(f) && !isDisabledByStrategy(f) }
    {
        preserved with (env e) {
            requireInvariant onlyDefaultAdminRoleIsManagerRoleAdmin();
            require !hasRole(DEFAULT_ADMIN_ROLE(), e.msg.sender);
        }
    }
