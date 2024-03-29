const ethers = require('ethers');
let ethereum = window.ethereum;
import config from "@/config";
import Vue from "vue";

export default {
  namespaced: true,
  state: {
    chainId: config.chainId,
    provider: null,
    account: null,
    balance: null
  },
  mutations: {
    setProvider(state, provider) {
      state.provider = provider;
    },
    setAccount(state, account) {
      state.account = account;
    },
    setBalance(state, balance) {
      state.balance = balance;
    }
  },
  getters: {
  },
  actions: {
    async initNetwork({ dispatch }) {
        await dispatch('initProvider');
        await dispatch('initAccount');
        await dispatch('updateBalance');
    },
    async initProvider({ commit }) {
      await ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      window.provider = provider;

      commit('setProvider', provider);
    },
    async initAccount({ commit, state }) {
      if (state.account) {
        return state.account;
      }

      let provider = state.provider;
      let accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const mainAccount = accounts[0];
        commit('setAccount', mainAccount);
      } else {
        Vue.$toast.error("No accounts available");
      }
    },
    async updateBalance({ state, commit }) {
      const mainAccount = state.account;
      const balance = parseFloat(ethers.utils.formatEther(await state.provider.getBalance(mainAccount)));

      commit('setBalance', balance);
    }
  },
};
