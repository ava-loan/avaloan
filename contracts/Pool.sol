// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CompoundingIndex.sol";
import "./IRatesCalculator.sol";
import "./IBorrowersRegistry.sol";

/**
 * @title Pool
 * @dev Contract allowing user to deposit and borrow funds from a single pot
 * Depositors are rewarded with the interest rates collected from borrowers.
 * Rates are compounded every second and getters always return the current deposit and borrowing balance.
 * The interest rates calculation is delegated to the external calculator contract.
 */
contract Pool is OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC20 {

  uint256 public constant MAX_POOL_UTILISATION = 0.95 ether;

  mapping(address => mapping(address => uint256)) private _allowed;
  mapping(address => uint256) private _deposited;

  mapping(address => uint256) public borrowed;

  IRatesCalculator private _ratesCalculator;
  IBorrowersRegistry private _borrowersRegistry;

  CompoundingIndex depositIndex = new CompoundingIndex();
  CompoundingIndex borrowIndex = new CompoundingIndex();


  function initialize(
      IRatesCalculator ratesCalculator_,
      IBorrowersRegistry borrowersRegistry_,
      CompoundingIndex depositIndex_,
      CompoundingIndex borrowIndex_
    )  initializer public {

      _ratesCalculator = ratesCalculator_;
      _borrowersRegistry = borrowersRegistry_;

      depositIndex = address(depositIndex_) == address(0) ? new CompoundingIndex() : depositIndex_;
      borrowIndex = address(borrowIndex_) == address(0) ? new CompoundingIndex() : borrowIndex_;

      __Ownable_init();

      _updateRates();
    }


  /* ========== SETTERS ========== */


  /**
   * Sets the new rate calculator.
   * The calculator is an external contract that contains the logic for calculating deposit and borrowing rates.
   * Only the owner of the Contract can execute this function.
   * @dev _ratesCalculator the address of rates calculator
  **/
  function setRatesCalculator(IRatesCalculator ratesCalculator_) external onlyOwner {
    require(address(ratesCalculator_) != address(0), "The rates calculator cannot set to a null address");
    _ratesCalculator = ratesCalculator_;
    _updateRates();
  }


  /**
   * Sets the new borrowers registry contract.
   * The borrowers registry decides if an account can borrow funds.
   * Only the owner of the Contract can execute this function.
   * @dev _borrowersRegistry the address of borrowers registry
  **/
  function setBorrowersRegistry(IBorrowersRegistry borrowersRegistry_) external onlyOwner {
    require(address(borrowersRegistry_) != address(0), "The borrowers registry cannot set to a null address");

    _borrowersRegistry = borrowersRegistry_;
  }


  /* ========== MUTATIVE FUNCTIONS ========== */
  function transfer(address recipient, uint256 amount) external override returns (bool) {
    require(recipient != address(0), "ERC20: cannot transfer to the zero address");
    require(recipient != address(this), "ERC20: cannot transfer to the pool address");

    _accumulateDepositInterests(msg.sender);

    require(_deposited[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");

    // (this is verified in "require" above)
    unchecked {
      _deposited[msg.sender] -= amount;
    }

    _accumulateDepositInterests(recipient);
    _deposited[recipient] += amount;

    emit Transfer(msg.sender, recipient, amount);

    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return _allowed[owner][spender];
  }

  function approve(address spender, uint256 amount) external override returns (bool) {
    _accumulateDepositInterests(msg.sender);

    require(_deposited[msg.sender] >= amount, "ERC20: approve amount exceeds balance");
    _allowed[msg.sender][spender] = amount;

    emit Approval(msg.sender, spender, amount);

    return true;
  }

  function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
    require(amount <= _allowed[sender][msg.sender], "Not enough tokens allowed to transfer required amount.");
    require(recipient != address(0), "ERC20: cannot transfer to the zero address");
    require(recipient != address(this), "ERC20: cannot transfer to the pool address");

    _accumulateDepositInterests(msg.sender);

    require(amount <= _deposited[sender], "Not enough tokens to transfer required amount.");

    _deposited[sender] -= amount;
    _allowed[sender][msg.sender] -= amount;

    _accumulateDepositInterests(recipient);
    _deposited[recipient] += amount;

    emit Transfer(sender, recipient, amount);

    return true;
  }


  /**
   * Deposits the message value
   * It updates user deposited balance, total deposited and rates
  **/
  function deposit() payable virtual external {
    _accumulateDepositInterests(msg.sender);

    _mint(msg.sender, msg.value);
    _updateRates();

    emit Deposit(msg.sender, msg.value, block.timestamp);
  }

  /**
   * Withdraws selected amount from the user deposits
   * @dev _amount the amount to be withdrawn
  **/
  function withdraw(uint256 _amount) external nonReentrant {
    _accumulateDepositInterests(msg.sender);

    _burn(msg.sender, _amount);

    payable(msg.sender).transfer(_amount);

    _updateRates();

    emit Withdrawal(msg.sender, _amount, block.timestamp);
  }


  /**
   * Borrows the specified amount
   * It updates user borrowed balance, total borrowed amount and rates
   * @dev _amount the amount to be borrowed
  **/
  function borrow(uint256 _amount) payable external canBorrow nonReentrant {
    require(address(this).balance >= _amount, "There is not enough funds in the pool to fund the loan.");
    require(totalSupply() - totalBorrowed() >= _amount, "There is no enough deposit in the pool to fund the loan.");

    _accumulateBorrowingInterests(msg.sender);

    borrowed[msg.sender] += _amount;
    borrowed[address(this)]+= _amount;

    payable(msg.sender).transfer(_amount);

    _updateRates();

    emit Borrowing(msg.sender, _amount, block.timestamp);
  }

  /**
   * Repays the message value
   * It updates user borrowed balance, total borrowed amount and rates
  **/
  function repay() payable external {
    _accumulateBorrowingInterests(msg.sender);

    require(borrowed[msg.sender] >= msg.value, "You are trying to repay more that was borrowed by user.");

    borrowed[msg.sender] -= msg.value;
    borrowed[address(this)] -= msg.value;

    _updateRates();

    emit Repayment(msg.sender, msg.value, block.timestamp);
  }


  /* =========


  /**
   * Returns the current borrowed amount for the given user
   * The value includes the interest rates owned at the current moment
   * @dev _user the address of queried borrower
  **/
  function getBorrowed(address _user) public view returns (uint256) {
    return borrowIndex.getIndexedValue(borrowed[_user], _user);
  }

  function totalSupply() public view override returns (uint256) {
    return balanceOf(address(this));
  }

  function totalBorrowed() public view returns (uint256) {
    return getBorrowed(address(this));
  }


  /**
   * Returns the current deposited amount for the given user
   * The value includes the interest rates earned at the current moment
   * @dev _user the address of queried depositor
  **/
  function balanceOf(address user) public view override returns (uint256) {
    return depositIndex.getIndexedValue(_deposited[user], user);
  }


  /**
   * Returns the current interest rate for deposits
  **/
  function getDepositRate() public view returns (uint256) {
    return _ratesCalculator.calculateDepositRate(totalBorrowed(), totalSupply());
  }


  /**
   * Returns the current interest rate for borrowings
  **/
  function getBorrowingRate() public view returns (uint256) {
    return _ratesCalculator.calculateBorrowingRate(totalBorrowed(), totalSupply());
  }


  /**
   * Recovers the surplus funds resultant from difference between deposit and borrowing rates
  **/
  function recoverSurplus(uint256 amount, address account) public onlyOwner nonReentrant {
    uint256 surplus = address(this).balance + totalBorrowed() - totalSupply();

    require(amount <= address(this).balance, "Trying to recover more surplus funds than pool balance");
    require(amount <= surplus, "Trying to recover more funds than current surplus");

    payable(account).transfer(amount);
  }


  /* ========== INTERNAL FUNCTIONS ========== */

  function _mint(address account, uint256 amount) internal {
    require(account != address(0), "ERC20: cannot mint to the zero address");

    _deposited[account] += amount;
    _deposited[address(this)] += amount;

    emit Transfer(address(0), account, amount);
  }


  function _burn(address account, uint256 amount) internal {
    require(_deposited[address(this)] >= amount, "ERC20: burn amount exceeds current pool indexed balance");
    require(_deposited[account] >= amount, "ERC20: burn amount exceeds user balance");

    // verified in "require" above
    unchecked {
      _deposited[account] -= amount;
      _deposited[address(this)] -= amount;
    }

    emit Transfer(account, address(0), amount);
  }


  function _updateRates() internal {
    depositIndex.setRate(_ratesCalculator.calculateDepositRate(totalBorrowed(), totalSupply()));
    borrowIndex.setRate(_ratesCalculator.calculateBorrowingRate(totalBorrowed(), totalSupply()));
  }


  function _accumulateDepositInterests(address user) internal {
    uint256 depositedWithInterests = balanceOf(user);
    uint256 interests = depositedWithInterests - _deposited[user];

    _mint(user, interests);

    emit InterestsCollected(user, interests, block.timestamp);

    depositIndex.updateUser(user);
    depositIndex.updateUser(address(this));
  }


  function _accumulateBorrowingInterests(address user) internal {
    uint256 borrowedWithInterests = getBorrowed(user);
    uint256 interests = borrowedWithInterests - borrowed[user];
    borrowed[user] = borrowedWithInterests;
    borrowed[address(this)] += interests;

    borrowIndex.updateUser(user);
    borrowIndex.updateUser(address(this));
  }


  /* ========== MODIFIERS ========== */

  modifier canBorrow() {
    require(address(_borrowersRegistry) != address(0), "Borrowers registry is not configured.");
    require(_borrowersRegistry.canBorrow(msg.sender), "Only the accounts authorised by borrowers registry may borrow.");
    require(totalSupply() > 0, "Cannot borrow from an empty pool.");
    _;
    require(totalBorrowed() * 1 ether / totalSupply() <= MAX_POOL_UTILISATION, "The pool utilisation cannot be greater than 95%.");
  }


  /* ========== EVENTS ========== */


  /**
    * @dev emitted after the user deposits funds
    * @param user the address performing the deposit
    * @param value the amount deposited
    * @param timestamp of the deposit
  **/
  event Deposit(address indexed user, uint256 value, uint256 timestamp);

  /**
    * @dev emitted after the user withdraws funds
    * @param user the address performing the withdrawal
    * @param value the amount withdrawn
    * @param timestamp of the withdrawal
  **/
  event Withdrawal(address indexed user, uint256 value, uint256 timestamp);

  /**
    * @dev emitted after the user borrows funds
    * @param user the address that borrows
    * @param value the amount borrowed
    * @param timestamp of the borrowing
  **/
  event Borrowing(address indexed user, uint256 value, uint256 timestamp);

  /**
    * @dev emitted after the user repays debt
    * @param user the address that repays
    * @param value the amount repaid
    * @param timestamp of the repayment
  **/
  event Repayment(address indexed user, uint256 value, uint256 timestamp);


  /**
    * @dev emitted after accumulating deposit interests
    * @param user the address that the deposit interest is accumulated
    * @param value the amount accumulated interest
    * @param timestamp of the interest accumulation
  **/
  event InterestsCollected(address indexed user, uint256 value, uint256 timestamp);


}
