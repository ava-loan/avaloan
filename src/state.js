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
  loan: {
    isCreated: undefined,
    balance: 0,
    debt: 0,
    solvencyRatio: 0,
    collateral: 0,
    assets: [
      {name: "AVAX", symbol: "AVX", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Bitcoin", symbol: "BTC", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Ether", symbol: "ETH", price: 0, balance: 0, value: 0 , share: 0},
      {name: "XRP", symbol: "XRP", price: 0, balance: 0, value: 0 , share: 0},
      {name: "Link", symbol: "LNK", price: 0, balance: 0, value: 0 , share: 0},
    ]
  }
};

export default state;
