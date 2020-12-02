<template>
  <md-app id="app">
    <md-app-toolbar class="md-primary">
      <img class="app-logo" src="/static/logo-background.png" @click="$router.push({path: '/'})"/>
      <span class="md-title">Avaloan</span>



        <!--<md-tabs class="md-primary" style="margin-left: 200px;" md-sync-route>-->
          <!--<md-tab-->
            <!--key="pool"-->
            <!--to="/pool"-->
            <!--md-label="Deposit & Earn"-->
            <!--exact>-->
          <!--</md-tab>-->

          <!--<md-tab-->
            <!--key="trade"-->
            <!--to="/trade"-->
            <!--md-label="Borrow & Trade"-->
            <!--exact>-->
          <!--</md-tab>-->


        <!--</md-tabs>-->


      <div class="md-toolbar-section-end" >
        <a href="https://github.com/jakub-wojciechowski/Avaloan" target="_blank" style="color: white;">
          <i class="fa fa-github" style="font-size:32px"></i>
        </a>
      </div>
     </md-app-toolbar>

    <md-app-content>
      <div>
        <md-dialog :md-active.sync="showNoWeb3">
          <md-app-toolbar class="md-accent">
            <span class="md-title">
              <md-icon>warning</md-icon>
              Cannot connect to the Blockchain
            </span>


          </md-app-toolbar>

          <md-dialog-content>
            Viewing this content requires using a Web3 browser such as Metamask.
            Please connect to the Kovan testnet.
            <br/><br/>
            Please refresh the window after setting up the Web3 plugin.

          </md-dialog-content>

        </md-dialog>

        <md-dialog :md-active.sync="showWrongNetwork">
          <md-app-toolbar class="md-accent">
            <span class="md-title">
              <md-icon>warning</md-icon>
              Cannot connect to the testnet
            </span>
          </md-app-toolbar>

          <md-dialog-content>
            Please make sure you are connecting to the testnet using your web3 browser.
            <br/><br/>
            Please refresh the window after updating the Web3 plugin.
          </md-dialog-content>

        </md-dialog>


        <router-view></router-view>
      </div>
    </md-app-content>

  </md-app>
</template>



<script>
  import State from '@/state'
  import { EventBus } from './event-bus.js';

  export default {
    data() {
      return {
        showWelcome: false,
        showNoWeb3: false,
        showWrongNetwork: false,
        show3Box: false,
        ida: State.ida,
        desktopScreen: false,
        showMobileScreen: false
      }
    },
    methods: {
    }

  }
</script>

<style>
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .md-app-content.md-theme-default {
    padding: 0;
    background-color: #7AE5BC;
  }

  .md-toolbar-row {
    width: auto;
  }

  .md-toolbar.md-theme-default.md-primary {
    background-color: #E84341;
    min-height: 52px;
  }

  .md-tabs.md-theme-default.md-primary .md-tabs-navigation {
    background-color: #E84341;
  }

  .md-dialog.md-theme-default {
    max-width: 768px;
    background-color: #f5f5f5;
  }
  .md-dialog-content {
    padding: 20px;
  }

  .md-app-container {
    overflow-x: hidden;
  }

  img.app-logo {
    height: 40px;
    cursor: pointer;
  }

</style>

