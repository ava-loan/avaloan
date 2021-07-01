// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CompoundingIndex.sol";
import "./IRatesCalculator.sol";
import "./IBorrowersRegistry.sol";
import "hardhat/console.sol";

/**
 * @title Pool
 * @dev Contract allowing user to deposit and borrow funds from a single pot
 * Depositors are rewarded with the interest rates collected from borrowers.
 * Rates are compounded every second and getters always return the current deposit and borrowing balance.
 * The interest rates calculation is delegated to the external calculator contract.
 */
contract Pool is Ownable, IERC20 {

  uint256 private _totalDeposited;
  mapping(address => mapping(address => uint256)) private _allowed;
  mapping(address => uint256) private _deposited;

  mapping(address => uint256) public borrowed;
  uint256 public totalBorrowed;

  IRatesCalculator private _ratesCalculator;
  IBorrowersRegistry private _borrowersRegistry;

  CompoundingIndex depositIndex = new CompoundingIndex();
  CompoundingIndex borrowIndex = new CompoundingIndex();


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
    require(msg.sender != address(0), "ERC20: transfer from the zero address");
    require(recipient != address(0), "ERC20: transfer to the zero address");

    _accumulateDepositInterests(msg.sender);

    require(_deposited[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
  unchecked {// (this is verified in "require" above)
    _deposited[msg.sender] -= amount;
  }

    _accumulateDepositInterests(recipient);
    _deposited[recipient] += amount;

    // TODO: verify CompoundingIndex

    emit Transfer(msg.sender, recipient, amount);

    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return _allowed[owner][spender];
  }

  function approve(address spender, uint256 amount) external override returns (bool) {
    _accumulateDepositInterests(msg.sender);
    // TODO: should we also accumulate here deposit interest for "spender"?
    require(_deposited[msg.sender] >= amount, "ERC20: approve amount exceeds balance");
    _allowed[msg.sender][spender] = amount;

    emit Approval(msg.sender, spender, amount);

    return true;
  }

  function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
    require(amount <= _deposited[sender], "Not enough tokens to transfer required amount.");
    require(amount <= _allowed[sender][msg.sender], "Not enough tokens allowed to transfer required amount.");

    _accumulateDepositInterests(msg.sender);

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
  function deposit() payable external {
    _accumulateDepositInterests(msg.sender);

    _mint(msg.sender, msg.value);
    _updateRates();

    emit Deposit(msg.sender, msg.value, block.timestamp);
  }

  /**
   * Withdraws selected amount from the user deposits
   * @dev _amount the amount to be withdrawn
  **/
  function withdraw(uint256 _amount) external {
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
  function borrow(uint256 _amount) payable external canBorrow {
    require(address(this).balance >= _amount, "There is no enough funds in the pool to fund the loan.");

    _accumulateBorrowingInterests(msg.sender);

    borrowed[msg.sender] = borrowed[msg.sender] + _amount;
    totalBorrowed = totalBorrowed + _amount;

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

    require(getBorrowed(msg.sender) >= msg.value, "You are trying to repay more that was borrowed.");

    borrowed[msg.sender] = borrowed[msg.sender] - msg.value;
    totalBorrowed = totalBorrowed - msg.value;

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
    return _totalDeposited;
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
    return _ratesCalculator.calculateDepositRate(totalBorrowed, _totalDeposited);
  }


  /**
   * Returns the current interest rate for borrowings
  **/
  function getBorrowingRate() public view returns (uint256) {
    return _ratesCalculator.calculateBorrowingRate(totalBorrowed, _totalDeposited);
  }


  /* ========== INTERNAL FUNCTIONS ========== */

  function _mint(address account, uint256 amount) internal {
    require(account != address(0), "ERC20: mint to the zero address");

    _totalDeposited += amount;
    _deposited[account] += amount;

    emit Transfer(address(0), account, amount);
  }

  function _burn(address account, uint256 amount) internal {
    require(account != address(0), "ERC20: burn from the zero address");

    uint256 accountBalance = _deposited[account];
    require(accountBalance >= amount, "ERC20: burn amount exceeds balance");

  unchecked {// verified in "require" above
    _deposited[account] = accountBalance - amount;
  }
    _totalDeposited -= amount;

    emit Transfer(account, address(0), amount);
  }

  function _updateRates() internal {
    depositIndex.setRate(_ratesCalculator.calculateDepositRate(totalBorrowed, _totalDeposited));
    borrowIndex.setRate(_ratesCalculator.calculateBorrowingRate(totalBorrowed, _totalDeposited));
  }

  function _accumulateDepositInterests(address user) internal {
    uint256 depositedWithInterests = balanceOf(user);
    uint256 interests = depositedWithInterests - _deposited[user];

    _mint(user, interests);

    emit InterestsCollected(user, interests, block.timestamp);

    depositIndex.updateUser(user);
  }

  function _accumulateBorrowingInterests(address user) internal {
    uint256 borrowedWithInterests = getBorrowed(user);
    uint256 interests = borrowedWithInterests - borrowed[user];
    borrowed[user] = borrowedWithInterests;
    totalBorrowed = totalBorrowed + interests;
    borrowIndex.updateUser(user);
  }


  /* ========== MODIFIERS ========== */

  modifier canBorrow() {
    require(address(_borrowersRegistry) != address(0), "Borrowers registry is not configured.");
    require(_borrowersRegistry.canBorrow(msg.sender), "Only the accounts authorised by borrowers registry may borrow.");
    _;
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
