// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./IAssetsExchange.sol";
import "./SupportedAssets.sol";
import "./Pool.sol";
import "redstone-flash-storage/lib/contracts/message-based/PriceAwareUpgradeable.sol";


/**
 * @title SmartLoan
 * A contract that is authorised to borrow funds using delegated credit.
 * It maintains solvency calculating the current value of assets and borrowings.
 * In case the value of assets held drops below certain level, part of the funds may be forcibly repaid.
 * It permits only a limited and safe token transfer.
 *
 */
contract SmartLoan is OwnableUpgradeable, PriceAwareUpgradeable, ReentrancyGuardUpgradeable {

  uint256 public constant PERCENTAGE_PRECISION = 1000;
  uint256 public constant LIQUIDATION_BONUS = 100;

  uint256 public LTV_SOLVENCY_THRESHOLD = 5000;
  uint256 public MIN_POST_SELLOUT_LTV = 4000;
  address private governor;

  SupportedAssets supportedAssets;
  IAssetsExchange public exchange;
  Pool pool;


  function initialize(SupportedAssets _supportedAssets, IAssetsExchange assetsExchange_, Pool pool_, address _governor) external initializer {
    supportedAssets = _supportedAssets;
    exchange = assetsExchange_;
    pool = pool_;
    __Ownable_init();
    __PriceAware_init();
    governor = _governor;
    LTV_SOLVENCY_THRESHOLD = 5000;
    MIN_POST_SELLOUT_LTV = 4000;
  }


  /**
   * Funds a loan with the value attached to the transaction
  **/
  function fund() external payable {

    emit Funded(msg.sender, msg.value, block.timestamp);
  }


  function setLtvSolvencyThreshold(uint256 newLtvSolvencyThreshold) external {
    require(msg.sender == governor, "Only the governor account can change the maximal LTV solvency threshold.");
    LTV_SOLVENCY_THRESHOLD = newLtvSolvencyThreshold;
  }


  function setMinPostSelloutLTV(uint256 newMinPostSelloutLTV) external {
    require(msg.sender == governor, "Only the governor account can change the minimal post-sellout LTV");
    MIN_POST_SELLOUT_LTV = newMinPostSelloutLTV;
  }


  /**
   * This function allows selling assets without checking if the loan will remain solvent after this operation.
   * It is used as part of the sellout() function which sells part/all of assets in order to bring the loan back to solvency.
   * It is possible that multiple different assets will have to be sold and for that reason we do not use the remainsSolvent modifier.
  **/
  function nonSolventAssetSale(bytes32 asset, uint256 _amount, uint256 _minAvaxOut) private {
    IERC20Metadata token = getERC20TokenInstance(asset);
    token.transfer(address(exchange), _amount);

    (bool success,) = address(exchange).call{value : 0}(
      abi.encodeWithSignature("sellAsset(bytes32,uint256,uint256)", asset, _amount, _minAvaxOut)
    );
    if (!success) {
      exchange.transferBack(asset);
    }
  }


  /**
  * This function attempts to sell just enough asset to receive targetAvaxAmount.
  * If there is not enough asset's balance to cover the whole targetAvaxAmount then the whole asset's balance
  * is being sold.
  * It is possible that multiple different assets will have to be sold and for that reason we do not use the remainsSolvent modifier.
  **/
  function nonSolventPartialOrFullAssetSale(bytes32 asset, uint256 targetAvaxAmount) private {
    IERC20Metadata token = getERC20TokenInstance(asset);
    uint256 balance = token.balanceOf(address(this));
    if (balance > 0) {
      uint256 minSaleAmount = exchange.getMinimumERC20TokenAmountForExactAVAX(targetAvaxAmount, supportedAssets.getAssetAddress(asset));
      if (balance < minSaleAmount) {
        uint256 saleAvaxValue = exchange.getEstimatedAVAXFromERC20Token(balance, supportedAssets.getAssetAddress(asset));
        nonSolventAssetSale(asset, balance, saleAvaxValue);
      } else {
        nonSolventAssetSale(asset, minSaleAmount, targetAvaxAmount);
      }
    }
  }


  /**
  * This function attempts to repay the _repayAmount back to the pool as well as pay a bonus to liquidator.
  * If there is not enough AVAX balance to repay the _repayAmount then the available AVAX balance will be repaid and no
  * liquidation bonus will be paid to the liquidator.
  **/
  function attemptRepay(uint256 _repayAmount) internal {
    if (address(this).balance <= _repayAmount) {
      repay(address(this).balance);
    } else {
      repay(_repayAmount);
    }
  }


  function payBonus(uint256 _bonus) internal {
    if (_bonus < address(this).balance) {
      payable(msg.sender).transfer(_bonus);
    } else if (address(this).balance != 0) {
      payable(msg.sender).transfer(address(this).balance);
    }
  }


  function selloutLoan() external onlyOwner {
    bytes32[] memory assets = supportedAssets.getAllAssets();
    for (uint i = 0; i < assets.length; i++) {
      nonSolventAssetSale(assets[i], getERC20TokenInstance(assets[i]).balanceOf(address(this)), 0);
    }

    uint256 debt = getDebt();
    require(address(this).balance >= debt, "Selling out all assets without repaying the whole debt is not allowed.");
    repay(debt);
    if (address(this).balance > 0) {
      withdraw(address(this).balance);
    }
  }


  function selloutInsolventLoan(uint256 repayAmount) external successfullSellout {
    require(!isSolvent(), "Cannot sellout a solvent account");

    uint256 debt = getDebt();
    if (repayAmount > debt) {
      repayAmount = debt;
    }
    uint256 bonus = repayAmount * LIQUIDATION_BONUS / PERCENTAGE_PRECISION;
    uint256 totalRepayAmount = repayAmount + bonus;

    sellout(totalRepayAmount);
    attemptRepay(repayAmount);
    payBonus(bonus);
  }


  /**
  * This function role is to sell part/all of the available assets in order to bring the loan back to a solvent state.
  *
  **/
  function sellout(uint256 totalRepayAmount) private {
    if (address(this).balance < (totalRepayAmount)) {
      bytes32[] memory assets = supportedAssets.getAllAssets();
      for (uint i = 0; i < assets.length; i++) {
        nonSolventPartialOrFullAssetSale(assets[i], totalRepayAmount - address(this).balance);
        if (address(this).balance >= totalRepayAmount) {
          break;
        }
      }
    }

  }


  /**
   * Withdraws an amount from the loan
   * This method could be used to cash out profits from investments
   * The loan needs to remain solvent after the withdrawal
   * @param _amount to be withdrawn
  **/
  function withdraw(uint256 _amount) public onlyOwner remainsSolvent nonReentrant {
    require(address(this).balance >= _amount, "There is not enough funds to withdraw");

    payable(msg.sender).transfer(_amount);

    emit Withdrawn(msg.sender, _amount, block.timestamp);
  }


  /**
   * Invests an amount to buy an asset
   * @param _asset code of the asset
   * @param _exactERC20AmountOut exact amount of asset to buy
   * @param _maxAvaxAmountIn maximum amount of AVAX to sell
  **/
  function invest(bytes32 _asset, uint256 _exactERC20AmountOut, uint256 _maxAvaxAmountIn) external onlyOwner remainsSolvent {
    require(address(this).balance >= _maxAvaxAmountIn, "Not enough funds available");

    exchange.buyAsset{value : _maxAvaxAmountIn}(_asset, _exactERC20AmountOut);

    emit Invested(msg.sender, _asset, _exactERC20AmountOut, block.timestamp);
  }


  /**
   * Redeem an investment by selling an asset
   * @param _asset code of the asset
   * @param _exactERC20AmountIn exact amount of token to sell
   * @param _minAvaxAmountOut minimum amount of the AVAX token to buy
  **/
  function redeem(bytes32 _asset, uint256 _exactERC20AmountIn, uint256 _minAvaxAmountOut) external onlyOwner remainsSolvent {
    IERC20Metadata token = getERC20TokenInstance(_asset);
    token.transfer(address(exchange), _exactERC20AmountIn);
    exchange.sellAsset(_asset, _exactERC20AmountIn, _minAvaxAmountOut);

    emit Redeemed(msg.sender, _asset, _exactERC20AmountIn, block.timestamp);
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

    pool.repay{value : _amount}();

    emit Repaid(msg.sender, _amount, block.timestamp);
  }


  receive() external payable {}


  /* ========== VIEW FUNCTIONS ========== */

  /**
    * Returns the current value of a loan including cash and investments
  **/
  function getTotalValue() public virtual view returns (uint256) {
    uint256 total = address(this).balance;
    bytes32[] memory assets = supportedAssets.getAllAssets();

    for (uint i = 0; i < assets.length; i++) {
      total = total + getAssetValue(assets[i]);
    }
    return total;
  }


  function getERC20TokenInstance(bytes32 _asset) internal view returns (IERC20Metadata) {
    address assetAddress = supportedAssets.getAssetAddress(_asset);
    IERC20Metadata token = IERC20Metadata(assetAddress);
    return token;
  }


  function getAssetPriceInAVAXWei(bytes32 _asset) internal view returns (uint256) {
    uint normalizedPrice = (getPriceFromMsg(_asset) * 10 ** 18) / getPriceFromMsg(bytes32('AVAX'));
    return normalizedPrice;
  }


  /**
    * Returns the current debt associated with the loan
  **/
  function getDebt() public virtual view returns (uint256) {
    return pool.getBorrowed(address(this));
  }


  /**
    * LoanToValue ratio is calculated as the ratio between debt and collateral.
    * The collateral is equal to total loan value takeaway debt.
  **/
  function getLTV() public view returns (uint256) {
    uint256 debt = getDebt();
    uint256 totalValue = getTotalValue();
    if (debt == 0) {
      return 0;
    } else if (debt < totalValue) {
      return debt * PERCENTAGE_PRECISION / (totalValue - debt);
    } else {
      return LTV_SOLVENCY_THRESHOLD;
    }
  }


  function getFullLoanStatus() public view returns (uint256[4] memory) {
    return [
    getTotalValue(),
    getDebt(),
    getLTV(),
    isSolvent() ? uint256(1) : uint256(0)
    ];
  }


  /**
    * Checks if the loan is solvent.
    * It means that the ratio between debt and collateral is below safe level,
    * which is parametrized by the LTV_SOLVENCY_THRESHOLD
  **/
  function isSolvent() public view returns (bool) {
    return getLTV() < LTV_SOLVENCY_THRESHOLD;
  }


  /**
    * Returns the value held on the loan contract in a given asset
    * @param _asset the code of the given asset
  **/
  function getAssetValue(bytes32 _asset) public view returns (uint256) {
    IERC20Metadata token = getERC20TokenInstance(_asset);
    uint256 assetBalance = exchange.getBalance(address(this), _asset);
    if (assetBalance > 0) {
      return getAssetPriceInAVAXWei(_asset) * assetBalance / 10 ** token.decimals();
    } else {
      return 0;
    }
  }


  /**
    * Returns the balances of all assets served by the price provider
    * It could be used as a helper method for UI
  **/
  function getAllAssetsBalances() public view returns (uint256[] memory) {
    bytes32[] memory assets = supportedAssets.getAllAssets();
    uint256[] memory balances = new uint256[] (assets.length);


    for (uint i = 0; i < assets.length; i++) {
      balances[i] = exchange.getBalance(address(this), assets[i]);
    }

    return balances;
  }


  /**
    * Returns the prices of all assets served by the price provider
    * It could be used as a helper method for UI
  **/
  function getAllAssetsPrices() public view returns (uint256[] memory) {
    bytes32[] memory assets = supportedAssets.getAllAssets();
    uint256[] memory prices = new uint256[] (assets.length);


    for (uint i = 0; i < assets.length; i++) {
      prices[i] = getAssetPriceInAVAXWei(assets[i]);
    }

    return prices;
  }


  /* ========== MODIFIERS ========== */

  modifier remainsSolvent() {
    _;
    require(isSolvent(), "The action may cause an account to become insolvent.");
  }

  /**
  * This modifier checks if the LTV is between MIN_POST_SELLOUT_LTV and LTV_SOLVENCY_THRESHOLD after performing the sellout() operation.
  * It is possible for the Loan to be above LTV_SOLVENCY_THRESHOLD only if the totalValue is equal to 0 which means that everything
  * was sold out and repayed.
  **/
  modifier successfullSellout() {
    _;
    uint256 LTV = getLTV();
    require(LTV >= MIN_POST_SELLOUT_LTV, "This operation would result in a loan with LTV lower than Minimal Sellout LTV which would put loan's owner in a risk of an unnecessarily high loss.");
    if (address(this).balance > 0) {
      require(LTV < LTV_SOLVENCY_THRESHOLD, "This operation would not result in bringing the loan back to a solvent state.");
    }
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
