import {syncTime} from "../../tools/helpers";

const ethers = require('ethers');
import LOAN from '@contracts/SmartLoan.json'
import LOAN_FACTORY from '@contracts/SmartLoansFactory.json'
import SUPPORTED_ASSETS from '@contracts/SupportedAssets.json'
import { calculateCollateral, fromWei, toWei, parseUnits, formatUnits } from "@/utils/calculate";
import { WrapperBuilder } from "redstone-flash-storage";

export default {
  namespaced: true,
  state: {
    loan: null,
    assets: [],
    isLoanAlreadyCreated: null,
    totalValue: null,
    debt: null,
    solvency: null
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
    setSupportedAssets(state, assets) {
      state.supportedAssets = assets;
    }
  },
  getters: {
  },
  actions: {
    async initSupportedAssets({ rootState, commit }) {
      const assetsContract = new ethers.Contract(SUPPORTED_ASSETS.networks[rootState.network.chainId].address, SUPPORTED_ASSETS.abi, provider.getSigner());
      let supported = (await assetsContract.getAllAssets()).map(
        asset => ethers.utils.parseBytes32String(asset)
      );

      commit('setSupportedAssets', supported);
    },
    async initLoan({ state, rootState, dispatch, commit }) {
      try {
        dispatch('initSupportedAssets');

        const provider = rootState.network.provider;
        const account = rootState.network.account;

        const loanFactory = new ethers.Contract(LOAN_FACTORY.networks[rootState.network.chainId].address, LOAN_FACTORY.abi, provider.getSigner());

        const userLoan = await loanFactory.getAccountForUser(account);

        commit('setIsLoanAlreadyCreated', userLoan != ethers.constants.AddressZero);

        if (state.isLoanAlreadyCreated) {
          const loan = new ethers.Contract(userLoan, LOAN.abi, provider.getSigner());

          //only for test
          await syncTime();

          const wrappedLoan = WrapperBuilder
            .wrapLite(loan)
            .usingPriceFeed("redstone-rapid");

          commit('setLoan', wrappedLoan);

          dispatch('updateLoanStats');
          dispatch('updateAssets');
        }
        return true;
      } catch (e) {
        console.log(e)
        return false;
      }
    },
    async updateAssets({ state, rootState, commit }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const prices = await loan.getAllAssetsPrices();
      const balances = await loan.getAllAssetsBalances();

      let assets = [
        {name: "AVAX", symbol: "AVAX", code: "avalanche-2", decimals: 18, price: 0, balance: 0, value: 0 , share: 0, native: true},
        {name: "Ether", symbol: "ETH", code: "ethereum", decimals: 18, price: 0, balance: 0, value: 0 , share: 0},
        {name: "Bitcoin", symbol: "BTC", code: "bitcoin", decimals: 8, price: 0, balance: 0, value: 0 , share: 0},
        {name: "Link", symbol: "LINK", code: "link", decimals: 18, price: 0, balance: 0, value: 0 , share: 0}
      ];

      assets = assets.filter(
        asset => state.supportedAssets.includes(asset.symbol) || asset.native
      );

      for (let i = 0; i < prices.length; i++) {
        if (i == 0) {
          assets[0].balance = parseFloat(formatUnits(await provider.getBalance(loan.address), assets[0].decimals));
          assets[0].price = 1;
        } else {
          assets[i].price = fromWei(prices[i]);
          assets[i].balance = parseFloat(formatUnits(balances[i].toString(), assets[i].decimals));
        }

        assets[i].value = assets[i].balance * assets[i].price;
        assets[i].share = assets[i].value / state.totalValue;
      }

      commit('setAssets', assets);
    },
    async updateLoanStats({ state, commit }) {
      const loan = state.loan;
      const status = await loan.getFullLoanStatus();

      commit('setTotalValue', fromWei(status[0]));
      commit('setDebt', fromWei(status[1]));
      commit('setSolvency', status[2]/1000);
    },
    async createNewLoan({ rootState, dispatch, commit }, { amount }) {
      try {
        const provider = rootState.network.provider;

        const collateral = calculateCollateral(amount);

        const loanFactory = new ethers.Contract(LOAN_FACTORY.networks[rootState.network.chainId].address, LOAN_FACTORY.abi, provider.getSigner());

        //TODO: find optimal value of gas
        const tx = await loanFactory.createAndFundLoan(toWei(amount.toString()), {value: toWei(collateral.toString()), gasLimit: 30000000});

        await provider.waitForTransaction(tx.hash);

        dispatch('initLoan');
      return true;
      } catch (e) {
        console.error(e)
        return false;
      }
    },
    async borrow({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.borrow(toWei(amount.toString()), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      return true;
    },
    async repay({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.repay(toWei(amount.toString()), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      return true;
    },
    async fund({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.fund({value: toWei(amount.toString()), gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      return true;
    },
    async withdraw({ state, rootState, dispatch, commit }, { amount }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      const tx = await loan.withdraw(toWei(amount.toString()), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');

      return true;
    },
    async invest({ state, rootState, dispatch, commit }, { asset, amount, decimals }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      let tx = await loan.invest(ethers.utils.formatBytes32String(asset), parseUnits(amount.toString(), decimals), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      dispatch('updateAssets');
      return true;
    },
    async redeem({ state, rootState, dispatch, commit }, { asset, amount, decimals }) {
      const provider = rootState.network.provider;
      const loan = state.loan;

      let tx = await loan.redeem(ethers.utils.formatBytes32String(asset), parseUnits(amount.toString(), decimals), {gasLimit: 3000000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateLoanStats');
      dispatch('updateAssets');
    }
  }
}
