import POOL from '@contracts/Pool.json';
import Vue from "vue";
const ethers = require('ethers');

export default {
  namespaced: true,
  state: {
    pool: null,
    totalDeposited: null,
    totalBorrowed: null,
    depositRate: null,
    borrowingRate: null,
    history: null,
    depositInterests: null,
    userBorrowed: null,
    userDeposited: null,
    deploymentBlock: null,
    waitingForDeposit: null
  },
  mutations: {
    setPool(state, pool) {
      state.pool = pool;
    },
    setTotalDeposited(state, totalDeposited) {
      state.totalDeposited = totalDeposited;
    },
    setTotalBorrowed(state, totalBorrowed) {
      state.totalBorrowed = totalBorrowed;
    },
    setDepositRate(state, depositRate) {
      state.depositRate = depositRate;
    },
    setBorrowingRate(state, borrowingRate) {
      state.borrowingRate = borrowingRate;
    },
    setHistory(state, history) {
      state.history = history;
    },
    setDepositInterests(state, depositInterests) {
      state.depositInterests = depositInterests; 
    },
    setDeploymentBlock(state, deploymentBlock) {
      state.deploymentBlock = deploymentBlock; 
    },
    setUserBorrowed(state, userBorrowed) {
      state.userBorrowed = userBorrowed; 
    },
    setUserDeposited(state, deposited) {
      state.userDeposited = deposited; 
    },
    setWaitingForDeposit(state, waiting) {
      state.waitingForDeposit = waiting; 
    }
  },
  getters: {
    getAvailable(state) {
      return state.totalDeposited - state.totalBorrowed;
    }
  },
  actions: {
    async initPool({ state, commit, rootState }) {
      if (!state.pool) {
        const provider = rootState.network.provider;
        console.log('provider');
        console.log(provider);
        const deploymentTx = POOL.networks[rootState.network.chainId].transactionHash;
        console.log('rootState.network.networkId');
        console.log(rootState.network.networkId);
        console.log('POOL')
        console.log(POOL)
        const deploymentReceipt = await rootState.network.provider.getTransactionReceipt(deploymentTx);

        commit('setDeploymentBlock', deploymentReceipt.blockNumber);
        let pool = new ethers.Contract(POOL.networks[rootState.network.chainId].address, POOL.abi, provider.getSigner());
        pool.iface = new ethers.utils.Interface(POOL.abi);
        console.log("Connected to the pool: " + pool.address);
        commit('setPool', pool);
      }
    },
    async updatePoolData({ dispatch }) {
      Promise.all([
        dispatch('updateTotalDeposited'),
        dispatch('updateTotalBorrowed'),
        dispatch('updateDepositRate'),
        dispatch('updateBorrowingRate'),
        dispatch('updateUserDeposited'),
        dispatch('updateUserBorrowed'),
        dispatch('updateHistory')
      ])
    },
    async updateTotalDeposited({ state, commit }) {
      const totalDeposited = parseFloat(ethers.utils.formatEther(await state.pool.totalDeposited()));
      commit('setTotalDeposited', totalDeposited);
    },
    async updateTotalBorrowed({ state, commit }) {
      const totalBorrowed = parseFloat(ethers.utils.formatEther(await state.pool.totalBorrowed()));
      commit('setTotalBorrowed', totalBorrowed);
    },
    async updateUserDeposited({ state, commit, rootState }) {
      const userDeposited = parseFloat(ethers.utils.formatEther(await state.pool.getDeposits(rootState.network.account)));
      commit('setUserDeposited', userDeposited);
      commit('setWaitingForDeposit', false);
    },
    async updateUserBorrowed({ state, commit, rootState }) {
      const userDeposited = parseFloat(ethers.utils.formatEther(await state.pool.getBorrowed(rootState.network.account)));
      commit('setUserBorrowed', userDeposited);
    },
    async updateDepositRate({ state, commit }) {
      const depositRate = parseFloat(ethers.utils.formatEther(await state.pool.getDepositRate()));
      commit('setDepositRate', depositRate);
    },
    async updateBorrowingRate({ state, commit }) {
      const borrowingRate = parseFloat(ethers.utils.formatEther(await state.pool.getBorrowingRate()));
      commit('setBorrowingRate', borrowingRate);
    },
    async updateHistory({ commit, state, rootState }) {
      const pool = state.pool;
      const account = rootState.network.account;
      const poolDepositorBalance = await pool.getDeposits(account);

      pool.myDeposits  = parseFloat(ethers.utils.formatEther(poolDepositorBalance));
      
      let totalDeposited = 0;
      let totalWithdrawn = 0;
      const provider = rootState.network.provider;
      let logs = await provider.getLogs({
        fromBlock: state.deploymentBlock,
        address: pool.address
      });

      logs = logs.filter(item => item.address === pool.address);

      const history = [];
      logs.forEach(log => {
        console.log(log);
        let parsed = pool.iface.parseLog(log);
        console.log(parsed);
        if (parsed.name !== 'Deposit' && parsed.name !== 'Withdrawal') return;

        console.log("User: " + parsed.args.user);
        console.log("Main account: " + account);

        if (parsed.args.user.toLocaleLowerCase() !== account.toLocaleLowerCase()) return;
      
        let event = {
          type: parsed.name,
          time: new Date(parseInt(parsed.args.timestamp.toString()) * 1000),
          value: parseFloat(ethers.utils.formatEther(parsed.args.value)),
          tx: log.transactionHash
        };

        if (event.type === 'Deposit') totalDeposited += event.value;
        if (event.type === 'Withdrawal') totalWithdrawn += event.value;

        console.log(event);
        history.unshift(event);
      });

      commit('setHistory', history);
  
      const depositInterests = pool.myDeposits - totalDeposited + totalWithdrawn;
      
      commit('setDepositInterests', depositInterests);
    },
    async updateUserBorrowed({ state, rootState }) {
      const balance = await state.pool.getBorrowed(rootState.network.account);
      const userBorrowed = parseFloat(ethers.utils.formatEther(balance));

      console.log("User pool loans: " + state.pool.myBorrowed);

      commit('setUserBorrowed', userBorrowed);
    },
    async updateUserBorrowed({ commit, state, rootState }) {
      const balance = await state.pool.getBorrowed(rootState.network.account);

      const userBorrowed = parseFloat(ethers.utils.formatEther(balance));
      console.log("User pool loans: " + state.pool.myBorrowed);

      commit('setUserBorrowed', userBorrowed);
    },
    async sendDeposit({ state, rootState, dispatch, commit }, { amount }) {
      commit('setWaitingForDeposit', true);
      try {
        console.log("Depositing: " + amount);
        const tx = await state.pool.deposit({gasLimit: 500000, value: ethers.utils.parseEther(amount)});
        console.log("Deposited: " + tx.hash);
        const receipt = await rootState.network.provider.waitForTransaction(tx.hash);
        console.log(receipt);
        dispatch('updateHistory');
        dispatch('updatePoolData');
        Vue.$toast.success("Transaction success");
        dispatch('network/updateBalance', {}, {root:true})
      } catch(e) {
        console.error('Transaction error');
        console.error(e);
        commit('setWaitingForDeposit', false);
        Vue.$toast.error("Transaction error");
      } 
    },
    async repay({ state, dispatch }, { amount }) {
      console.log("Repaying: " + amount);
  
      const tx = await state.pool.repay({gasLimit: 500000, value: ethers.utils.parseEther(amount.toString())});
      console.log("Repaid: " + tx.hash);
      const receipt = await provider.waitForTransaction(tx.hash);
      console.log(receipt);

      dispatch('updateUserBorrowed');
      dispatch('updatePoolData');
    },
    async withdraw({ state, dispatch, commit }, { amount }) {
      try {
        commit('setWaitingForDeposit', true);
        console.log("Withdrawing: " + amount);
      
        const tx = await state.pool.withdraw(ethers.utils.parseEther(amount.toString()), {gasLimit: 500000});
        console.log("Withdrawn: " + tx.hash);
        const receipt = await provider.waitForTransaction(tx.hash);
        console.log(receipt);
    
        dispatch('updateHistory');
        dispatch('updatePoolData');
        Vue.$toast.success("Transaction success");
        dispatch('network/updateBalance', {}, {root:true})
      } catch (e) {
        console.error('Transaction error');
        console.error(e);
        commit('setWaitingForDeposit', false);
        Vue.$toast.error("Transaction error");
      }
    },
    async borrow({ state, dispatch }, { amount }) {
      console.log("Borrowing: " + amount);
  
      const tx = await state.pool.borrow(ethers.utils.parseEther(amount), {gasLimit: 500000});
      console.log("Borrowed: " + tx.hash);
      const receipt = await provider.waitForTransaction(tx.hash);
      console.log(receipt);
      dispatch('updateHistory');
      dispatch('updatePoolData');
    }
  },
};
