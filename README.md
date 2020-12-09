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

* Reactive - every method that changes loan structure satisfy the (remainsSolvent)[https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L228] modifier with ensures that the loan is always left in a solvent state

* Active - if a loan becomes insolvent due to external factors, like assets price movement, anyone is allowed to liquidate a part of the loan by calling the (liquidate) method and forcing loan repayment. To incentivise liquidators to monitor loans and cover gas costs there is a liquidation bonus paid for every successful liquidation calculated as a percentage of the liquidation amount and paid from the smart loan balance. 

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
