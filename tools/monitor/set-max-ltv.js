const Loans = require('../loans.js');
const args = require('yargs').argv;

let maxLTC = args.maxLTC ? args.maxLTC : 4000;

console.log(`Setting maximal LTV of all loans to ${maxLTC}`);

async function setMaximalLTV() {
  let loans = await Loans.findAllLoans();
  loans.forEach( async loanAddress => {
    await Loans.setMaxLTV(loanAddress, maxLTC);
  });
}


setMaximalLTV();
