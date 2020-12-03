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
      {name: "US dollar", symbol: "USD", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Pound sterling", symbol: "GBP", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Euro", symbol: "EUR", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Bitcoin", symbol: "BTC", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Ether", symbol: "ETH", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Gold", symbol: "XAU", price: 0, balance: 0, value: 0 , share: 0},
    ]
  }
};

export default state;
