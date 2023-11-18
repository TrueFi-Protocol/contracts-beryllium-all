import "FlexiblePortfolio.spec"

rule withdrawBurnsAssetsFromOwner() {
    uint256 assets;
    address receiver;
    address owner;
    address sender;

    env e1;
    uint256 shares;
    require e1.msg.sender == currentContract;
    shares, _  = withdrawController.onWithdraw(e1, sender, assets, receiver, owner);

    uint256 ownerBalance_old = balanceOf(owner);

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    withdraw(e, assets, receiver, owner);

    uint256 ownerBalance_new = balanceOf(owner);

    assert ownerBalance_new == ownerBalance_old - shares;
}

rule redeemBurnsAssetsFromOwner() {
    uint256 shares;
    address owner;

    uint256 ownerBalance_old = balanceOf(owner);

    env e;
    redeem(e, shares, _, owner);

    uint256 ownerBalance_new = balanceOf(owner);

    assert ownerBalance_new == ownerBalance_old - shares;
}

rule onlyWithdrawAndRedeemBurnAssets(method f) {    
    uint256 totalSupply_old = totalSupply();

    env e;
    callFunction(f, e);

    uint256 totalSupply_new = totalSupply();

    ifEffectThenFunction(
        totalSupply_new < totalSupply_old,
        f.selector == withdraw(uint256,address,address).selector ||
        f.selector == redeem(uint256,address,address).selector
    );
    assert true;
}
