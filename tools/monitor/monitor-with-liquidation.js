const Loans = require('../loans.js');
const Liquidate = require('../liquidate.js');
const args = require('yargs').argv;

let interval = args.interval ? args.interval : 5;

console.log(`Monitoring loans with ${interval} seconds interval`);

async function monitorAndLiquidate() {
  let loans = await Loans.findAllLoans();
  loans.forEach( async loanAddress => {
    let status = await Loans.getLoanStatus(loanAddress);
    if (!status.isSolvent) {
      console.log("Insolvent loan found: " + loanAddress);
      console.log(status);
      let amount = await Liquidate.calculateLiquidationAmount(loanAddress);
      await Liquidate.liquidate(loanAddress, amount);
    }
  });
  setTimeout(monitorAndLiquidate, interval * 1000);
}


monitorAndLiquidate();
