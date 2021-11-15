// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./SmartLoan.sol";
import "./Pool.sol";
import "./IAssetsExchange.sol";
import "./SupportedAssets.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

/**
 * @title SmartLoansFactory
 * It creates and fund the Smart Loan.
 * It's also responsible for keeping track of the loans and ensuring they follow the solvency protection rules
 * and could be authorised to access the lending pool.
 *
 */
contract SmartLoansFactory is IBorrowersRegistry {

  modifier oneLoanPerOwner {
    require(ownersToLoans[msg.sender] == address(0), "Only one loan per owner is allowed.");
    _;
  }

  event SmartLoanCreated(address indexed accountAddress, address indexed creator);

  Pool private pool;
  SupportedAssets private supportedAssets;
  IAssetsExchange assetsExchange;
  UpgradeableBeacon public upgradeableBeacon;
  address trustedPriceSigner;

  uint256 private constant MAX_VAL = 2**256-1 ether;

  mapping(address => address) public ownersToLoans;
  mapping(address => address) public loansToOwners;

  SmartLoan[] loans;

  constructor(
    Pool _pool,
    SupportedAssets _supportedAssets,
    IAssetsExchange _assetsExchange,
    address _trustedPriceSigner
  ) {
    pool = _pool;
    supportedAssets = _supportedAssets;
    assetsExchange = _assetsExchange;
    SmartLoan smartLoanImplementation = new SmartLoan();
    upgradeableBeacon = new UpgradeableBeacon(address(smartLoanImplementation));
    upgradeableBeacon.transferOwnership(msg.sender);
    trustedPriceSigner = _trustedPriceSigner;
  }

  function createLoan() external oneLoanPerOwner returns(SmartLoan) {
    BeaconProxy beaconProxy = new BeaconProxy(payable(address(upgradeableBeacon)), abi.encodeWithSelector(SmartLoan.initialize.selector, address(supportedAssets), address(assetsExchange), address(pool), upgradeableBeacon.owner()));
    SmartLoan smartLoan = SmartLoan(payable(address(beaconProxy)));

    //Update registry and emit event
    updateRegistry(smartLoan);
    smartLoan.authorizeSigner(trustedPriceSigner);
    smartLoan.transferOwnership(msg.sender);

    return smartLoan;
  }

  function createAndFundLoan(uint256 _initialDebt) external oneLoanPerOwner payable returns(SmartLoan) {
    BeaconProxy beaconProxy = new BeaconProxy(payable(address(upgradeableBeacon)), abi.encodeWithSelector(SmartLoan.initialize.selector, address(supportedAssets), address(assetsExchange), address(pool), upgradeableBeacon.owner()));
    SmartLoan smartLoan = SmartLoan(payable(address(beaconProxy)));

    //Update registry and emit event
    updateRegistry(smartLoan);

    //Fund account with own funds and credit
    smartLoan.fund{value:msg.value}();
    smartLoan.borrow(_initialDebt);
    require(smartLoan.isSolvent());

    smartLoan.authorizeSigner(trustedPriceSigner);
    smartLoan.transferOwnership(msg.sender);

    return smartLoan;
  }

  function updateRegistry(SmartLoan _newAccount) internal {
    ownersToLoans[msg.sender] = address(_newAccount);
    loansToOwners[address(_newAccount)] = msg.sender;
    loans.push(_newAccount);

    emit SmartLoanCreated(address(_newAccount), msg.sender);
  }

  function canBorrow(address _account) external view override returns(bool) {
    return loansToOwners[_account] != address(0);
  }

  function getAccountForUser(address _user) external view override returns(address) {
    return address(ownersToLoans[_user]);
  }

  function getOwnerOfLoan(address _loan) external view override returns(address) {
    return loansToOwners[_loan];
  }

  function getAllLoans() public view returns(SmartLoan[] memory) {
    return loans;
  }

}
