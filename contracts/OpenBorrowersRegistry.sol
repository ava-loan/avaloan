pragma solidity 0.6.0;

import "./SmartLoan.sol";
import "./Pool.sol";
import "./IPriceProvider.sol";
import "./IAssetExchange.sol";

/**
 * @title OpenBorrowersRegistry
 * It the simpled borrowers registry that allows every account
 * Should be used for test purpose only
 */
contract OpenBorrowersRegistry is IBorrowersRegistry {

  function canBorrow(address _account) external view override returns(bool) {
    return true;
  }

  function getAccountForUser(address _user) external view override returns(SmartLoan) {
    return SmartLoan(address(0));
  }

  function getOwnerOfLoan(address _loan) external view override returns(address) {
    return address(0);
  }

}
