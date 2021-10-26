const ethers = require('ethers');
import LOAN from '@contracts/SmartLoan.json'
import LOAN_FACTORY from '@contracts/SmartLoansFactory.json'
import SUPPORTED_ASSETS from '@contracts/SupportedAssets.json'
import { fromWei, toWei, parseUnits, formatUnits } from "@/utils/calculate";
import config from "@/config";
import { WrapperBuilder } from "redstone-flash-storage";

export default {
  namespaced: true,
  state: {
    loan: null,
    assets: null,
    isLoanAlreadyCreated: null,
    totalValue: null,
    debt: null,
    solvency: null,
    minSolvency: null,
    loanBalance: null
  },
  mutations: {
    setLoan(state, loan) {
      state.loan = loan;
    },
    setAssets(state, assets) {
      state.assets = assets;
    },
    setIsLoanAlreadyCreated(state, created) {
      state.isLoanAlreadyCreated = created;
    },
    setTotalValue(state, totalValue) {
      state.totalValue = totalValue;
    },
    setDebt(state, debt) {
      state.debt = debt;
    },
    setSolvency(state, solvency) {
      state.solvency = solvency;
    },
    setMinSolvency(state, minSolvency) {
      state.minSolvency = minSolvency;
    },
    setSupportedAssets(state, assets) {
      state.supportedAssets = assets;
    },
    setLoanBalance(state, balance) {
      state.loanBalance = balance;
    }
  },
  actions: {
    async initSupportedAssets({ rootState, commit }) {
      const assetsContract = new ethers.Contract(SUPPORTED_ASSETS.networks[rootState.network.chainId].address, SUPPORTED_ASSETS.abi, provider.getSigner());
      let supported = (await assetsContract.getAllAssets()).map(
        asset => ethers.utils.parseBytes32String(asset)
      );

      commit('setSupportedAssets', supported);
    },
    async fetchLoan({ state, rootState, dispatch, commit }) {
      dispatch('initSupportedAssets');

      const provider = rootState.network.provider;
      const account = rootState.network.account;

      const loanFactory = new ethers.Contract(LOAN_FACTORY.networks[rootState.network.chainId].address, LOAN_FACTORY.abi, provider.getSigner());

      const userLoan = await loanFactory.getAccountForUser(account);

      commit('setIsLoanAlreadyCreated', userLoan !== ethers.constants.AddressZero);

      if (state.isLoanAlreadyCreated) {
        const loan = new ethers.Contract(userLoan, LOAN.abi, provider.getSigner());


        const wrappedLoan = WrapperBuilder
          .wrapLite(loan)
          .usingPriceFeed("redstone-rapid");

        commit('setLoan', wrappedLoan);

        const minSolvencyRatio = (await wrappedLoan.minSolvencyRatio()) / (await wrappedLoan.PERCENTAGE_PRECISION())
        commit('setMinSolvency', minSolvencyRatio);

        dispatch('updateLoanStats');
        dispatch('updateLoanBalance');
        dispatch('updateAssets');
      }
      return true;
    },
    async updateAssets({ state, commit }) {

      const loan = state.loan;

      const prices = await loan.getAllAssetsPrices();
      const balances = await loan.getAllAssetsBalances();

      const nativeToken = Object.entries(config.ASSETS_CONFIG).find(asset => asset[0] === config.nativeToken);

      let assets = {};
      assets[nativeToken[0]] = nativeToken[1];
      state.supportedAssets.forEach(
        asset => assets[asset] = config.ASSETS_CONFIG[asset]
      );

      Object.entries(assets).forEach(
        (asset, i) => {
          const symbol = asset[0];
          if (symbol === config.nativeToken) {
            assets[symbol].balance = state.loanBalance;
            assets[symbol].price = 1;
          } else {
            assets[symbol].price = fromWei(prices[i - 1]);
            assets[symbol].balance = parseFloat(formatUnits(balances[i - 1].toString(), assets[symbol].decimals));
          }
          assets[symbol].value = assets[symbol].balance * assets[symbol].price;
          assets[symbol].share = assets[symbol].value / state.totalValue;
        }
      )

      commit('setAssets', assets);
    },
    async updateLoanStats({ state, commit }) {
      const loan = state.loan;
      const status = await loan.getFullLoanStatus();

      commit('setTotalValue', fromWei(status[0]));
      commit('setDebt', fromWei(status[1]));
      commit('setSolvency', status[2]/1000);
    },
    async updateLoanBalance({ state, rootState, commit }) {
      const provider = rootState.network.provider;
      const balance = parseFloat(formatUnits(await provider.getBalance(state.loan.address), config.ASSETS_CONFIG[config.nativeToken].decimals));

      commit('setLoanBalance', balance);
    },
    async createNewLoan({ rootState, dispatch, commit }, { amount, collateral }) {
      const provider = rootState.network.provider;

      const loanFactory = new ethers.Contract(LOAN_FACTORY.networks[rootState.network.chainId].address, LOAN_FACTORY.abi, provider.getSigner());

      //TODO: find optimal value of gas
      const tx = await loanFactory.createAndFundLoan(toWei(amount.toString()), {value: toWei(collateral.toString()), gasLimit: 30000000});

      await provider.waitForTransaction(tx.hash);

      dispatch('fetchLoan');
    },
    async borrow({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.borrow(toWei(amount.toString()), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
    },
    async repay({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.repay(toWei(amount.toString()), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
    },
    async fund({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.fund({value: toWei(amount.toString()), gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
    },
    async withdraw({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.withdraw(toWei(amount.toString()), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
    },
    async invest({ state, rootState, dispatch, commit }, { asset, amount, avaxAmount, slippage, decimals }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const maxAvaxAmount = (1 + slippage * (1 + config.SLIPPAGE_CHANGE_TOLERANCE)) * avaxAmount;

      let tx = await loan.invest(
        ethers.utils.formatBytes32String(asset),
        parseUnits(amount.toString(), decimals),
        toWei(maxAvaxAmount.toString()),
      {gasLimit: 3000000});

      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      dispatch('updateLoanBalance');
      dispatch('updateAssets');
    },
    async redeem({ state, rootState, dispatch, commit }, { asset, amount, decimals }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      let tx = await loan.redeem(ethers.utils.formatBytes32String(asset), parseUnits(amount.toString(), decimals), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      dispatch('updateLoanBalance');
      dispatch('updateAssets');
    }
  }
}
