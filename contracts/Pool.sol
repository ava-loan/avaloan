pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
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
contract Pool is Ownable {
    using SafeMath for uint256;

    mapping(address => uint256) public deposits;
    uint256 public totalDeposited;

    mapping(address => uint256) public borrowed;
    uint256 public totalBorrowed;

    IRatesCalculator ratesCalculator;
    IBorrowersRegistry borrowersRegistry;

    CompoundingIndex depositIndex = new CompoundingIndex();
    CompoundingIndex borrowIndex = new CompoundingIndex();


    /* ========== SETTERS ========== */


    /**
     * Sets the new rate calculator
     * The calculator is an external contract that contains the logic for calculating deposit and borrowing rates
     * @dev _ratesCalculator the address of rates calculator
    **/
    function setRatesCalculator(IRatesCalculator _ratesCalculator) public {
        require(address(_ratesCalculator) != address(0), "The rates calculator cannot set to a null address");

        ratesCalculator = _ratesCalculator;
        updateRates();
    }


    /**
     * Sets the new rate calculator
     * The borrowers registry decides if an account can borrow funds
     * @dev _borrowersRegistry the address of borrowers registry
    **/
    function setBorrowersRegistry(IBorrowersRegistry _borrowersRegistry) public {
      require(address(_borrowersRegistry) != address(0), "The borrowers registry cannot set to a null address");

      borrowersRegistry = _borrowersRegistry;
    }


    /* ========== MUTATIVE FUNCTIONS ========== */


    /**
     * Deposits the message value
     * It updates user deposited balance, total deposited and rates
    **/
    function deposit() payable external {
        accumulateDepositInterests(msg.sender);

        deposits[msg.sender] = deposits[msg.sender].add(msg.value);
        totalDeposited = totalDeposited.add(msg.value);

        updateRates();

        emit Deposit(msg.sender, msg.value, now);
    }


    /**
     * Withdraws selected amount from the user deposits
     * @dev _amount the amount to be withdrawn
    **/
    function withdraw(uint256 _amount) external {
        accumulateDepositInterests(msg.sender);

        require(deposits[msg.sender] >= _amount, "You are trying to withdraw more that was deposited.");

        deposits[msg.sender] = deposits[msg.sender].sub(_amount);
        totalDeposited = totalDeposited.sub(_amount);

        msg.sender.transfer(_amount);

        updateRates();

        emit Withdrawal(msg.sender, _amount, now);
    }


    /**
     * Borrows the specified amount
     * It updates user borrowed balance, total borrowed amount and rates
     * @dev _amount the amount to be borrowed
    **/
    function borrow(uint256 _amount) payable external canBorrow {
        require(address(this).balance >= _amount, "There is no enough funds in the pool to fund the loan.");

        accumulateBorrowingInterests(msg.sender);

        borrowed[msg.sender] = borrowed[msg.sender].add(_amount);
        totalBorrowed = totalBorrowed.add(_amount);

        msg.sender.transfer(_amount);

        updateRates();

        emit Borrowing(msg.sender, _amount, now);
    }

    /**
     * Repays the message value
     * It updates user borrowed balance, total borrowed amount and rates
    **/
    function repay() payable external {
        accumulateBorrowingInterests(msg.sender);

        require(getBorrowed(msg.sender) >= msg.value, "You are trying to repay more that was borrowed.");

        borrowed[msg.sender] = borrowed[msg.sender].sub(msg.value);
        totalBorrowed = totalBorrowed.sub(msg.value);

        updateRates();

        emit Repayment(msg.sender, msg.value, now);
    }


    /* ========== VIEW FUNCTIONS ========== */


    /**
     * Returns the current borrowed amount for the given user
     * The value includes the interest rates owned at the current moment
     * @dev _user the address of queried borrower
    **/
    function getBorrowed(address _user) public view returns(uint256) {
        return borrowIndex.getIndexedValue(borrowed[_user], _user);
    }


    /**
     * Returns the current deposited amount for the given user
     * The value includes the interest rates earned at the current moment
     * @dev _user the address of queried depositor
    **/
    function getDeposits(address user) public view returns(uint256) {
      return depositIndex.getIndexedValue(deposits[user], user);
    }


    /**
     * Returns the current interest rate for deposits
    **/
    function getDepositRate() public view returns(uint256) {
      return ratesCalculator.calculateDepositRate(totalBorrowed, totalDeposited);
    }


    /**
     * Returns the current interest rate for borrowings
    **/
    function getBorrowingRate() public view returns(uint256) {
      return ratesCalculator.calculateBorrowingRate(totalBorrowed, totalDeposited);
    }


    /* ========== INTERNAL FUNCTIONS ========== */


    function updateRates() internal {
      depositIndex.setRate(ratesCalculator.calculateDepositRate(totalBorrowed, totalDeposited));
      borrowIndex.setRate(ratesCalculator.calculateBorrowingRate(totalBorrowed, totalDeposited));
    }


    function accumulateDepositInterests(address user) internal {
        uint256 depositedWithInterests = getDeposits(user);
        uint256 interests = depositedWithInterests.sub(deposits[user]);
        deposits[user] = depositedWithInterests;
        totalDeposited = totalDeposited.add(interests);
        depositIndex.updateUser(user);
    }


    function accumulateBorrowingInterests(address user) internal {
        uint256 borrowedWithInterests = getBorrowed(user);
        uint256 interests = borrowedWithInterests.sub(borrowed[user]);
        borrowed[user] = borrowedWithInterests;
        totalBorrowed = totalBorrowed.add(interests);
        borrowIndex.updateUser(user);
    }


    /* ========== MODIFIERS ========== */

    modifier canBorrow() {
      require(address(borrowersRegistry) != address(0), "Borrowers registry is not configured");
      require(borrowersRegistry.canBorrow(msg.sender), "Only the accounts authorised by borrowers registry may borrow");
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

}
