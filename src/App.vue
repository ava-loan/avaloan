<template>
<div class="page-content">
  <Banner v-if="showNetworkBanner">
    You are connected to a wrong network. <a @click="connectToProperChain"><b>Click here</b></a> to switch to the correct one.
  </Banner>
  <Banner v-if="showMetamaskBanner">
    Please download and activate
    <a href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn" target="_blank"><b>Metamask plugin</b></a>.
  </Banner>
  <div class="top-bar">
    <router-link to="/">
      <img src="src/assets/icons/delta-prime-logo.svg" class="logo">
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
  import Banner from "@/components/Banner";
  import { mapActions, mapState } from "vuex";
  import config from "@/config";
  const ethereum = window.ethereum;
  import Vue from 'vue';

  export default {
    components: {
      Navbar,
      Wallet,
      Banner
    },
    data: () => {
      return {
        showNetworkBanner: false,
        showMetamaskBanner: false
      }
    },
    async created() {
      if (!ethereum) {
        this.showMetamaskBanner = true;
        return;
      }

      if (await this.checkConnectedChain() !== config.chainId) {
        this.showNetworkBanner = true;
        return;
      }

      await this.metamaskChecks();
      await this.initNetwork();
      await this.initPrices();
      await this.initPool();
      await this.fetchLoan();
      await this.updatePoolData();
    },
    computed: {
      ...mapState('network', ['account'])
    },
    methods: {
      ...mapActions("network", ["initNetwork"]),
      ...mapActions("pool", ["initPool", "updatePoolData"]),
      ...mapActions("loan", ["fetchLoan"]),
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
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              const walletParams = process.env.NODE_ENV === 'development' ?
                {
                  chainName: 'Localhost',
                  chainId: this.toHex(config.chainId),
                  rpcUrls:  [ "http://localhost" ]
                }
                :
                {
                  chainName: 'Forked Avalanche',
                  chainId: this.toHex(config.chainId),
                  //TODO IMPORTANT: set proper address in production
                  rpcUrls:  [ "https://207.154.255.139/" ]
                }

              await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: walletParams
              });
            } catch (addError) {
              Vue.$toast.error("Error while adding network");
            }
          }
          Vue.$toast.error("Error while switching network");
        }
      },
      async metamaskChecks() {
        window.ethereum.on('accountsChanged', function () {
          window.location.reload();
        })
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

  a {
    color: black;
  }

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

