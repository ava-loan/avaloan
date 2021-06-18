// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPriceProvider.sol";
import "./IAssetsExchange.sol";
import "./Pool.sol";


/**
 * @title SmartLoan
 * A contract that is authorised to borrow funds using delegated credit.
 * It maintains solvency calculating the current value of assets and borrowings.
 * In case the value of assets held drops below certain level, part of the funds may be forcibly repaid.
 * It permits only a limited and safe token transfer.
 *
 */
contract SmartLoan is Ownable {

  uint256 private constant PERCENTAGE_PRECISION = 1000;
  uint256 private constant MAX_SOLVENCY_RATIO = 10000;

  uint256 public constant LIQUIDATION_BONUS = 100;
  uint256 private constant LIQUIDATION_CAP = 200;

  IPriceProvider public priceProvider;
  IAssetsExchange public exchange;
  Pool pool;

  uint256 public minSolvencyRatio = 1200;

  constructor(IPriceProvider _priceProvider, IAssetsExchange _assetsExchange, Pool _pool) {
    priceProvider = _priceProvider;
    exchange = _assetsExchange;
    pool = _pool;
  }


  /**
   * Funds a loan with the value attached to the transaction
  **/
  function fund() external payable {

    emit Funded(msg.sender, msg.value, block.timestamp);
  }


  /**
   * Withdraws an amount from the loan
   * This method could be used to cash out profits from investments
   * The loan needs to remain solvent after the withdrawal
   * @param _amount to be withdrawn
  **/
  function withdraw(uint256 _amount) external remainsSolvent onlyOwner {
    require(address(this).balance >= _amount, "There is not enough funds to withdraw");

    payable(msg.sender).transfer(_amount);

    emit Withdrawn(msg.sender, _amount, block.timestamp);
  }


  /**
   * Invests an amount to buy an asset
   * @param _asset to code of the asset
   * @param _amount to be bought
  **/
  function invest(bytes32 _asset, uint256 _amount) external onlyOwner {
    exchange.buyAsset{value: address(this).balance}(_asset, _amount);

    emit Invested(msg.sender, _asset, _amount, block.timestamp);
  }


  /**
   * Redeem an investment by selling an asset
   * @param _asset to code of the asset
   * @param _amount to sell
  **/
  function redeem(bytes32 _asset, uint256 _amount) external onlyOwner remainsSolvent {
    exchange.sellAsset(_asset, _amount);

    emit Redeemed(msg.sender, _asset, _amount, block.timestamp);
  }


  /**
   * Borrows funds from the pool
   * @param _amount of funds to borrow
  **/
  function borrow(uint256 _amount) external onlyOwner remainsSolvent {
    pool.borrow(_amount);

    emit Borrowed(msg.sender, _amount, block.timestamp);
  }


  /**
   * Repays funds to the pool
   * @param _amount of funds to repay
  **/
  function repay(uint256 _amount) public {
    if (isSolvent()) {
      require(msg.sender == owner());
    }

    require(address(this).balance >= _amount, "There is not enough funds to repay the loan");

    pool.repay{value:_amount}();

    emit Repaid(msg.sender, _amount, block.timestamp);
  }




  function liquidate(uint256 _amount) public remainsSolvent {
    require(!isSolvent(), "Cannot liquidate a solvent account");
    repay(_amount);

    //Liquidator reward
    uint256 bonus = _amount * LIQUIDATION_BONUS / PERCENTAGE_PRECISION;
    payable(msg.sender).transfer(bonus);
  }

  receive() external payable {}


  /* ========== VIEW FUNCTIONS ========== */

  /**
    * Returns the current value of a loan including cash and investments
  **/
  function getTotalValue() public view returns(uint256) {
    uint256 total = address(this).balance;

    bytes32[] memory assets = priceProvider.getAllAssets();
    for(uint i = 0; i< assets.length; i++) {
      total = total + getAssetValue(assets[i]);
    }
    return total;
  }


  /**
    * Returns the current debt associated with the loan
  **/
  function getDebt() public view returns(uint256) {
    return pool.getBorrowed(address(this));
  }


  function getSolvencyRatio() public view returns(uint256) {
    uint256 debt = getDebt();
    if (debt == 0) {
      return MAX_SOLVENCY_RATIO;
    } else {
      return getTotalValue() * PERCENTAGE_PRECISION / debt;
    }
  }


  function getFullLoanStatus() public view returns(uint256[4] memory) {
    return [
      getTotalValue(),
      getDebt(),
      getSolvencyRatio(),
      isSolvent() ? uint256(1) : uint256(0)
    ];
  }


  /**
    * Checks if the loan is solvent.
    * It means that the ratio between total value and debt is above save level,
    * which is parametrized by the minSolvencyRatio
  **/
  function isSolvent() public view returns(bool) {
    return getSolvencyRatio() >= minSolvencyRatio;
  }


  /**
    * Returns the value held on the loan contract in a given asset
    * @param _asset the code of the given asset
  **/
  function getAssetValue(bytes32 _asset) public view returns(uint256) {
    return priceProvider.getPrice(_asset) * exchange.getBalance(address(this), _asset) / 1 ether;
  }


  /**
    * Returns the balances of all assets served by the price provider
    * It could be used as a helper method for UI
  **/
  function getAllAssetsBalances() public view returns(uint256[] memory) {
    bytes32[] memory assets = priceProvider.getAllAssets();
    uint256[] memory balances = new uint256[] (assets.length);


    for(uint i = 0; i< assets.length; i++) {
      balances[i] = exchange.getBalance(address(this), assets[i]);
    }

    return balances;
  }


  /**
    * Returns the prices of all assets served by the price provider
    * It could be used as a helper method for UI
  **/
  function getAllAssetsPrices() public view returns(uint256[] memory) {
    bytes32[] memory assets = priceProvider.getAllAssets();
    uint256[] memory prices = new uint256[] (assets.length);


    for(uint i = 0; i< assets.length; i++) {
      prices[i] = priceProvider.getPrice(assets[i]);
    }

    return prices;
  }


  /* ========== MODIFIERS ========== */

  modifier remainsSolvent() {
    _;
    require(isSolvent(), "The action may cause an account to become insolvent.");
  }


  /* ========== EVENTS ========== */

  /**
  * @dev emitted after a loan is funded
  * @param funder the address which funded the loan
  * @param amount the amount of funds
  * @param time of funding
  **/
  event Funded(address indexed funder, uint amount, uint time);


  /**
  * @dev emitted after the funds are withdrawn from the loan
  * @param owner the address which withdraws funds from the loan
  * @param amount the amount of funds withdrawn
  * @param time of the withdrawal
  **/
  event Withdrawn(address indexed owner, uint amount, uint time);


  /**
  * @dev emitted after the funds are invested into an asset
  * @param investor the address of investor making the purchase
  * @param asset bought by the investor
  * @param amount the investment
  * @param time of the investment
  **/
  event Invested(address indexed investor, bytes32 indexed asset, uint amount, uint time);


  /**
  * @dev emitted after the investment is sold
  * @param investor the address of investor selling the asset
  * @param asset sold by the investor
  * @param amount the investment
  * @param time of the redemption
  **/
  event Redeemed(address indexed investor, bytes32 indexed asset, uint amount, uint time);


  /**
  * @dev emitted when funds are borrowed from the pool
  * @param borrower the address of borrower
  * @param amount of the borrowed funds
  * @param time of the borrowing
  **/
  event Borrowed(address indexed borrower, uint amount, uint time);


  /**
  * @dev emitted when funds are repaid to the pool
  * @param borrower the address initiating repayment
  * @param amount of repaid funds
  * @param time of the repayment
  **/
  event Repaid(address indexed borrower, uint amount, uint time);



}
