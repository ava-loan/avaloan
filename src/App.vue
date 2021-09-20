<template>
<div class="page-content">
  <div class="top-bar">
    <router-link to="/">
      <img src="src/assets/icons/avaloan-logo.svg" class="logo">
    </router-link> 
    <Navbar></Navbar>
    <div class="connect" v-if="!account" v-on:click="initNetwork()">Connect to wallet</div>
    <Wallet class="wallet" v-else />
  </div>
  <router-view></router-view>
</div>
</template>



<script>
  import Navbar from "@/components/Navbar.vue";
  import Wallet from "@/components/Wallet.vue";
  import { mapActions, mapState } from "vuex";
  import config from "@/config";
  const ethereum = window.ethereum;
  import Vue from 'vue';

  export default {
    components: {
      Navbar,
      Wallet
    },
    async created() {
      if (await this.checkConnectedChain() == config.chainId) {
        //TODO: optimize async tasks

        await this.initNetwork();
        await this.initPrices();
        await this.initPool();
        await this.initLoan();
        await this.updatePoolData();
      } else {
        this.connectToProperChain();
      }
    },
    data() {
      return {
      }
    },
    computed: {
      ...mapState('network', ['account'])
    },
    methods: {
      ...mapActions("network", ["initNetwork"]),
      ...mapActions("pool", ["initPool", "updatePoolData"]),
      ...mapActions("loan", ["initLoan"]),
      ...mapActions("prices", ["initPrices"]),
      async checkConnectedChain() {
        const chainId = await ethereum.request({ method: 'eth_chainId' });

        ethereum.on('chainChanged', () => {
          window.location.reload();
        });

        return this.toDec(chainId);
      },
      async connectToProperChain() {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: this.toHex(config.chainId) }],
          });
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            try {
              //TODO IMPORTANT: change in production
              await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{ 
                  chainName: 'Localhost',
                  chainId: this.toHex(config.chainId),
                  rpcUrls:  [ "http://localhost:8545" ] }],
              });
            } catch (addError) {
              Vue.$toast.error("Error while adding network");
            }
          }
          Vue.$toast.error("Error while switching network");
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

  .page-content:before {
    content: ' ';
    display: block;
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    opacity: 0.08;
    z-index: -1;

    background-image: linear-gradient(152deg, #7476fc 23%, #ff6f43 65%, #f5217f 96%);
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 40px 0;
  }

  .logo {
    cursor: pointer;
    margin-left: 5vw;

    @media screen and (min-width: $md) {
      margin-left: 40px;
    }

    &:hover {
      transform: scale(1.02);
    }
  }

  .connect, .wallet {
    margin-right: 5vw;

    @media screen and (min-width: $md) {
      margin-right: 40px;
    }
  }

  .connect {
    white-space: nowrap;
    color: #6b70ed;
    cursor: pointer;

    &:hover {
      font-weight: 500;
    }
  }
</style>

