/* eslint-disable */
let state = {
  pool: {
    myDeposits: 0,
    myBorrowed: 0,
    totalDeposited: 0,
    totalBorrowed: 0,
    depositRate: 0,
    borrowingRate: 0,
    ethRate: 0,
    history: [],
    depositInterests: 0,
    borrowingInterests: 0
  },
  account: {
    isCreated: undefined,
    balance: 0,
    debt: 0,
    solvencyRatio: 0,
    collateral: 0,
    assets: [
      {name: "US dollar", symbol: "sUSD", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Pound sterling", symbol: "sGBP", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Euro", symbol: "sEUR", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Bitcoin", symbol: "sBTC", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Ether", symbol: "sETH", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Eos", symbol: "sEOS", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Gold", symbol: "sXAU", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Silver", symbol: "sXAG", price: 0, balance: 0, value: 0 , share: 0}
    ]
  }
};

export default state;
