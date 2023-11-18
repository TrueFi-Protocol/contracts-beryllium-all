import "FlexiblePortfolio.spec"

rule depositMintsAssets() {
    uint256 assets;
    address receiver;
    address sender;

    env e1;
    uint256 shares;
    require e1.msg.sender == currentContract;
    shares, _ = depositController.onDeposit(e1, sender, assets, receiver);

    uint256 receiverBalance_old = balanceOf(receiver);
    uint256 totalSupply_old = totalSupply();

    env e;
    require e.msg.sender == sender;
    require e.block.timestamp == e1.block.timestamp;
    deposit(e, assets, receiver);

    uint256 receiverBalance_new = balanceOf(receiver);
    uint256 totalSupply_new = totalSupply();

    assert receiverBalance_new == receiverBalance_old + shares;
    assert totalSupply_new == totalSupply_old + shares;
}

rule mintMintsAssets() {
    uint256 shares;
    address receiver;

    uint256 receiverBalance_old = balanceOf(receiver);
    uint256 totalSupply_old = totalSupply();

    env e;
    mint(e, shares, receiver);

    uint256 receiverBalance_new = balanceOf(receiver);
    uint256 totalSupply_new = totalSupply();

    assert receiverBalance_new == receiverBalance_old + shares;
    assert totalSupply_new == totalSupply_old + shares;
}

rule onlyDepositAndMintMintAssets(method f) {    
    uint256 totalSupply_old = totalSupply();

    env e;
    callFunction(f, e);

    uint256 totalSupply_new = totalSupply();

    ifEffectThenFunction(
        totalSupply_new > totalSupply_old,
        f.selector == deposit(uint256,address).selector ||
        f.selector == mint(uint256,address).selector
    );
    assert true;
}
