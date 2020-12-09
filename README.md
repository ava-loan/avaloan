# Overview

Avaloan - Smart Loans on the AVAX blockchain

# Features

## Depositing

A user deposits funds by calling the [deposit](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/Pool.sol#L53) method from the Pool contract. 
The deposited amount is taken from the message value and recorded on the user's balance. 
It immediately starts to accumulate interests based on the current rates. 

## Borrowing

A user borrows funds by calling the [borrow](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/Pool.sol#L90) method from the Pool contract. 
The borrowed amount is specified as the parameter to the function call and is transferred to the user account provided there are enough funds available in the pool. 

## Accumulating interests

The interests are accumulated every second and compounding on the depositors' account. To save the gas costs the Pool contract uses the [CompoundingIndex](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/CompoundingIndex.sol) helper contract which manages the balances using virtual indices and updates the state only after user interaction.

The total amount of interest earned by depositors always equals the total amount of interests owned by borrowers. 

## Insolvency protection

Every loan provides a real-time solvency score accessible by the [getSolvencyRatio](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L153) method. The score is calculated as a ratio between the total loan value and the amount of funds borrowed from the pool. The total value may change in time based on the current prices of assets owned by the loan. The solvency score must always remain above the [minSolvencyRatio](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L30) parameter. 

There are two mechanisms to enforce the solvency:

* Reactive - every method that changes loan structure satisfy the [remainsSolvent](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L228) modifier with ensures that the loan is always left in a solvent state

* Active - if a loan becomes insolvent due to external factors, like assets price movement, anyone is allowed to liquidate a part of the loan by calling the (liquidate) method and forcing loan repayment. To incentivise liquidators to monitor loans and cover gas costs there is a liquidation bonus paid for every successful liquidation calculated as a percentage of the liquidation amount and paid from the smart loan balance. 

## Loan adjustment

A user can manage the current solvency ratio by changing the debt or the margin level. The loan margin could be increased by calling the [fund](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L42) method and passing the AVAX tokens along with the message. Similarly, a user may call the [withdraw](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L54) to remove funds from the smart loans. This method allows investors to cash-out profits in the assets valuation increses. 


## Additional tools and scripts

Loan monitoring and liquidation could be automated to enable 24/7 screening and ensure effortless execution. The project contains additional scripts & tools located in the [tools folder](https://github.com/jakub-wojciechowski/avaloan/tree/master/tools) which could be invoked from a command line.

The liquidation logic is provided in the [liquidate](https://github.com/jakub-wojciechowski/avaloan/blob/master/tools/liquidate.js) nodejs module. A user may invoke the [calculateLiquidationAmount](https://github.com/jakub-wojciechowski/avaloan/blob/master/tools/liquidate.js#L37) method to compute the maximum amount that could be safely liquidated based on the current loan state. The liquidation is executed by calling the [liquidate](https://github.com/jakub-wojciechowski/avaloan/blob/master/tools/liquidate.js#L27) method.

The monitoring scripts are located in the [monitoring](https://github.com/jakub-wojciechowski/avaloan/tree/master/tools/monitor) subfolder. The [monitor-with-logs](https://github.com/jakub-wojciechowski/avaloan/blob/master/tools/monitor/monitor-with-logs.js) one fetches all the active loans and print their current status that shows: total value, current debt, solvency ratio and solvency status. The [monitor-with-liquidation](https://github.com/jakub-wojciechowski/avaloan/blob/master/tools/monitor/monitor-with-liquidation.js) one automatically liquidates the loans which are insolvent. 

The monitoring scripts could be invoked from the command line and the user may pass an additional `--interval` parameter to specify the refresh period. 


# User interface

## Pool dashboard

In the top section the dashboard contains 4 widget showing **global state** of the pool:
* Total deposited - sum of all deposits
* Total borrowed - sum of all loans
* Deposit rate - yearly interest rate earned currently by depositors
* Borrowing rate - yearly interest rate owned by borrowers

In the middle of the screen, there are two widgets showing data for the connected **user**:
* Deposits - sum of deposits with earned interests and the history of deposits and withdrawals
* Loans - sum of loans with paid interests and the history of borrowings and repayments

![Pool UI](https://raw.githubusercontent.com/jakub-wojciechowski/avaloan/master/static/pool-ui.png)

# Building

To build the application please install first all of the dependencies by running:

    npm install

Make sure that all of the smart-contracts are compiled before trying to deploy the dApp:

    npx buidler compile

To deploy the front-end on your local machine please type in your command line:

    npm run dev

# Testing

Smart contracts test could be executed by typing:

    npx buidler test

# Development

This project was funded by the Avalanche-X grant programme.
