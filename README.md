# Avaloan - Smart Loans on the Avalanche blockchain

[LIVE DEMO](https://avaloan.xyz/#/) on the Fuji testnet

Lending is by far the most popular use case in the currently booming Decentralised Finance sector. The second-generation lending protocols like Aave and Compound allows users to deposit and borrow from a lending pool automatically setting the interests rates to balance capital supply and demand. However, both of them suffer from liquidity crunch as borrowers need to provide collateral that significantly exceeds their loan size. It causes the collateral funds to remain idle in the pool. From the macroeconomic perspective, it means that approximately **70% of the funds stay unproductive** and is not used for assets investment, trading or staking activity.

Smart Loans is the next generation lending platform on AVA that will allow low-collateral borrowing from pooled deposits. The core innovation is lending funds not to a personal account but a special purpose smart-contract. The contract automatically guards solvency and every activity needs to undergo a series of checks. This mechanism blocks transactions which could cause the smart-loan valuation to drop below a safe threshold. The insolvency risk is further mitigated by a decentralised liquidation mechanism allowing anyone to forcibly repay part of the loan due to assets price movements caused by external factors. Wrapping loans with smart contracts reduces the collateral need, improving the money supply in the entire Avalanche ecosystem. Patient capital holders will earn interests on the funds provided, while borrowers could use extra capital for investment in high-grow assets.

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

![Pool UI](https://raw.githubusercontent.com/jakub-wojciechowski/avaloan/master/static/pool-ui.png)

In the top section the dashboard contains 4 widgets showing **global state** of the pool:
* Total deposited - sum of all deposits
* Total borrowed - sum of all loans
* Deposit rate - yearly interest rate earned currently by depositors
* Borrowing rate - yearly interest rate owned by borrowers

In the middle of the screen, there are two widgets showing data for the connected **user**:
* Deposits - sum of deposits with earned interests and the history of deposits and withdrawals
* Loans - sum of loans with paid interests and the history of borrowings and repayments

## Smart loan view

![smart-loan-ui](https://raw.githubusercontent.com/jakub-wojciechowski/avaloan/master/static/smart-loan-ui.png)

In the top section there are 3 widgets:
* Total borrowed - the amount of funds borrowed by this loan from the pool denominated in AVAX / USD and the current borrowing costs (APR)
* Solvency ratio - shows a ratio between the total loan value and the debt plus a threshold value below which the loan could be liquidated
* Total value - the total value of the loan including user margin

In the bottom section, there is a table showing the current allocation of the borrowed funds.
It lists assets available for investment, their price and current holdings displayed in absolute values and as portfolio percentage.
Every investable asset could be bought and sold by clicking on "Invest" and "Redeem" buttons.
There is also an option to see the asset's historical performance by clicking on the details ("v") button.

# Smart-contracts architecture

![Pool UI](https://github.com/jakub-wojciechowski/avaloan/blob/master/static/smart-contracts-diagram.png)

The smart contracts could be divided into two main groups:

### Lending

* **Pool.sol** - a contract that aggregates deposits and borrowings.
It keeps track of the balance and liabilities of every user.
It accumulated the interests in the real-time based on the rates model connected by the [setRatesCalculator](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/Pool.sol#L40).
The borrowers are verified by the linked [BorrowersRegistry](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/Pool.sol#L53) contract.

* **CompoundingIndex.sol** - a helper contract that facilitates the calculation of deposits and loans interests rates. It uses a global index, that is snapshotted on every user interaction to achieve a O(1) complexity balance updates.

* **FixedRatesCalculator.sol** - a basic rates calculation model that returns a rate which could be set up by an admin using off-chain calculations.

* **UtilisationRatesCalculator.sol** - an interest rates calculation model that automatically adjust the rates based on the current pool utilisation defined as a ratio between borrowed and deposited funds. The mechanism helps to balance the capital supply and demand because a higher need for loans means that the users will need to pay higher interests rates which should reduce the borrowers' appetite.

* **IBorrowersRegistry.sol** - an interface that keeps track of borrowers and their loans by maintaining a bidirectional mapping. It also answers if an account is allowed to borrow funds by calling the [canBorrow](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/IBorrowersRegistry.sol#L11) method.

### Investment

* **SmartLoan.sol** - a core loan contract that manages borrowings, investments and guards solvency.
Borrowing activity is performed by the [borrow](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L91) and the [repay](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L102) methods which interact with the [Pool](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L28) contract.
Investment activity is implemented in the [invest](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L68) and the [redeem](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L80) methods which interact with the [Assets Exchange](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L27) contract.
All of the methods mentioned are wrapped by the [remainsSolvent](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L228) modifier which doesn't allow the solvency to drop below the specified [minimum solvency ratio](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L30).
The solvency level is calculated as the ratio between the current loan value and the amount of borrowed funds (debt) in the real-time using the [getSolvencyRatio](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L153) function.
If the solvency ratio falls below a safe level anyone could liquidate the loan calling the [liquidate](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L117) function. This pays back part of the debt and a percentage of the liquidated amount is transferred to the caller as a reward for monitoring the loan status.
A user can reduce the liquidation risk adjusting amount of personal funds deposited to the loan (margin) by calling the [fund](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L42) method. If the solvency ratio is considerably high, a user may withdraw part of the funds calling the [withdraw](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SmartLoan.sol#L54) function.

* **SmartLoansFactory.sol** - a helper contract that orchestrates loans creation and initial funding in one transaction. It also manages data about loan creators acting as a Borrowers Registry.

* **SimplePriceProvider.sol** - an oracle contract that feeds the current price of assets. It enables the real-time valuation of loans. It lists all the supported assets in the [getAllAssets](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SimplePriceProvider.sol#L76) function and the price could be queried by the [getPrice](https://github.com/jakub-wojciechowski/avaloan/blob/master/contracts/SimplePriceProvider.sol#L68) method. The price provider is integrated with CoinGecko aggregator by the [set-market-prices](https://github.com/jakub-wojciechowski/avaloan/blob/master/tools/scripts/set-market-prices.js) script.

* **SimpleAssetsExchange.sol** - an exchange contract that allows investing AVAX into other popular crypto-tokens. It's a simplified version that could be replaced by a full-fledged DEX or synthetic assets protocol.

# Building

To build the application please install first all of the dependencies by running:

    npm install

Make sure that all of the smart-contracts are compiled before trying to deploy the dApp:

    npx hardhat compile

To deploy the front-end on your local machine please type in your command line:

    npm run dev

# Testing

Smart contracts test could be executed by typing:

    npx hardhat test

# Development

This project was funded by the Avalanche-X grant programme.
