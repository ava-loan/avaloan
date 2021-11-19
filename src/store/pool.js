import POOL from '@contracts/Pool.json';
const ethers = require('ethers');

export default {
  namespaced: true,
  state: {
    pool: null,
    totalDeposited: null,
    totalBorrowed: null,
    depositRate: null,
    borrowingRate: null,
    poolHistory: null,
    depositInterests: null,
    userBorrowed: null,
    userDeposited: null,
    deploymentBlock: null
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
    setPoolHistory(state, poolHistory) {
      state.poolHistory = poolHistory;
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
        const deploymentTx = POOL.networks[rootState.network.chainId].transactionHash;
        const deploymentReceipt = await rootState.network.provider.getTransactionReceipt(deploymentTx);

        commit('setDeploymentBlock', deploymentReceipt.blockNumber);
        let pool = new ethers.Contract(POOL.networks[rootState.network.chainId].address, POOL.abi, provider.getSigner());
        pool.iface = new ethers.utils.Interface(POOL.abi);

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
        dispatch('updatePoolHistory')
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
      const userDeposited = parseFloat(ethers.utils.formatEther(await state.pool.balanceOf(rootState.network.account)));
      commit('setUserDeposited', userDeposited);
      return true;
    },
    async updateDepositRate({ state, commit }) {
      const depositRate = parseFloat(ethers.utils.formatEther(await state.pool.getDepositRate()));
      commit('setDepositRate', depositRate);
    },
    async updateBorrowingRate({ state, commit }) {
      const borrowingRate = parseFloat(ethers.utils.formatEther(await state.pool.getBorrowingRate()));
      commit('setBorrowingRate', borrowingRate);
    },
    async updatePoolHistory({ commit, state, rootState }) {
      const pool = state.pool;
      const account = rootState.network.account;
      const poolDepositorBalance = await pool.balanceOf(account);

      pool.myDeposits = parseFloat(ethers.utils.formatEther(poolDepositorBalance));

      let totalDeposited = 0;
      let totalWithdrawn = 0;
      const provider = rootState.network.provider;
      let logs = await provider.getLogs({
        fromBlock: state.deploymentBlock,
        address: pool.address
      });

      logs = logs.filter(item => item.address === pool.address);

      const poolHistory = [];
      logs.forEach(log => {
        let parsed = pool.iface.parseLog(log);

        if (parsed.name !== 'Deposit' && parsed.name !== 'Withdrawal') return;

        if (parsed.args.user.toLocaleLowerCase() !== account.toLocaleLowerCase()) return;

        let event = {
          type: parsed.name,
          time: new Date(parseInt(parsed.args.timestamp.toString()) * 1000),
          value: parseFloat(ethers.utils.formatEther(parsed.args.value)),
          tx: log.transactionHash
        };

        if (event.type === 'Deposit') totalDeposited += event.value;
        if (event.type === 'Withdrawal') totalWithdrawn += event.value;

        poolHistory.unshift(event);
      });

      commit('setPoolHistory', poolHistory);

      const depositInterests = pool.myDeposits - totalDeposited + totalWithdrawn;

      commit('setDepositInterests', depositInterests);
    },
    async updateUserBorrowed({ state, rootState, commit }) {
      const balance = await state.pool.getBorrowed(rootState.network.account);
      const userBorrowed = parseFloat(ethers.utils.formatEther(balance));

      commit('setUserBorrowed', userBorrowed);
    },
    async sendDeposit({ state, rootState, dispatch, commit }, { amount }) {
      const tx = await state.pool.deposit({gasLimit: 500000, value: ethers.utils.parseEther(amount.toString())});
      await rootState.network.provider.waitForTransaction(tx.hash);

      dispatch('updatePoolHistory');
      dispatch('updatePoolData');
      dispatch('network/updateBalance', {}, {root:true})
    },
    async repay({ state, dispatch }, { amount }) {

      const tx = await state.pool.repay({gasLimit: 500000, value: ethers.utils.parseEther(amount.toString())});
      await provider.waitForTransaction(tx.hash);

      dispatch('updateUserBorrowed');
      dispatch('updatePoolData');
    },
    async withdraw({ state, dispatch, commit }, { amount }) {
      const tx = await state.pool.withdraw(ethers.utils.parseEther(amount.toString()), {gasLimit: 500000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updatePoolHistory');
      dispatch('updatePoolData');
      dispatch('network/updateBalance', {}, {root:true})
    },
    async borrow({ state, dispatch }, { amount }) {
      const tx = await state.pool.borrow(ethers.utils.parseEther(amount), {gasLimit: 500000});
      await provider.waitForTransaction(tx.hash);

      dispatch('updatePoolHistory');
      dispatch('updatePoolData');
    }
  },
};
