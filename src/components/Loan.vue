/* eslint-disable */
<template>
  <div class="page">

    <md-dialog :md-active.sync="processing" :md-click-outside-to-close="false">
      <md-dialog-title>Processing transaction</md-dialog-title>

      <md-dialog-content style="text-align: center">


        <md-progress-spinner md-mode="indeterminate"></md-progress-spinner>

        <div>
          Please wait....
        </div>

      </md-dialog-content>
    </md-dialog>

    <md-drawer class="md-drawer md-right" :md-active.sync="showBorrowingPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Borrow funds</span>
      </md-toolbar>

      <div class="text">
        Borrow funds to start investing.
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="borrowLoanAmount">Amount in AVAX</label>
            <md-input name="borrowLoanAmount" id="borrowLoanAmount" v-model="borrowLoanAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="borrow()">Borrow</md-button>

      </form>
    </md-drawer>

    <md-drawer class="md-drawer md-right" :md-active.sync="showRepaymentPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Repay funds</span>
      </md-toolbar>

      <div class="text">
        Repay funds to reduce your debt.
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="repayAmount">Amount in AVAX</label>
            <md-input name="repayAmount" id="repayAmount" v-model="repayAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="repay()">Repay</md-button>

      </form>
    </md-drawer>

    <md-drawer class="md-drawer md-right" :md-active.sync="showFundPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Add funds</span>
      </md-toolbar>

      <div class="text">
        Add funds to improve your solvency ratio
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="fundAmount">Amount in AVAX</label>
            <md-input name="fundAmount" id="fundAmount" v-model="fundAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="fund()">Fund</md-button>

      </form>
    </md-drawer>

    <md-drawer class="md-drawer md-right" :md-active.sync="showWithdrawPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Withdraw funds</span>
      </md-toolbar>

      <div class="text">
        Withdraw funds to cash out profits
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="withdrawAmount">Amount in AVAX</label>
            <md-input name="withdrawAmount" id="withdrawAmount" v-model="withdrawAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="withdraw()">Withdraw</md-button>

      </form>
    </md-drawer>

    <md-drawer class="md-drawer md-right" :md-active.sync="showInvestPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Invest funds</span>
      </md-toolbar>

      <div class="text">
        Invest your funds to increase profits
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="investAmount">Amount in {{selectedAsset}}</label>
            <md-input name="investAmount" id="investAmount" v-model="investAmount"
                      :disabled="processing"/>
          </md-field>
          <div class="collateral-info" v-if="investAmount">
            This will cost <b>{{investmentCost | avax}} ({{investmentCost | usd}})</b>
          </div>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="invest()">Invest</md-button>

      </form>
    </md-drawer>


    <div class="md-layout md-gutter" v-show="!loan.isCreated">

      <div class="md-layout-item md-size-25"></div>

      <div class="md-layout-item md-size-50">

        <md-card>
          <md-card-header>
            <md-card-header-text>
              <div class="md-title">Take a new smart loan </div>
              <div class="md-subhead">Decide how much you want to borrow and provide the collateral</div>

            </md-card-header-text>

          </md-card-header>

          <md-card-content>

            <form novalidate>
              <div class="form-container">
                <md-field>
                  <label for="borrowAmount">Initial balance (amount to borrow)</label>
                  <md-input name="borrowAmount" id="borrowAmount" v-model="borrowAmount"
                            :disabled="processing"/>
                </md-field>
                <div class="collateral-info">
                  You will need to provide <b>{{collateral | avax}}</b> as an initial buffer.
                </div>

              </div>

            </form>



            <div style="text-align: center">
              <md-button class="md-raised md-primary pool-button" @click="createLoan">Create</md-button>
            </div>
          </md-card-content>

        </md-card>


      </div>

    </div>

    <div class="md-layout" v-show="loan.isCreated">


      <div class="md-layout-item md-medium-size-10 md-size-10" style="margin-right: 2%"></div>

      <div class="md-layout-item md-medium-size-25 md-size-25 widget">
        <div class="md-card md-card-stats md-theme-default">
          <div class="md-card-header md-card-header-icon md-card-header-blue card-widget">
            <div class="card-icon">
              <div class="card-icon">
                <img class="card-image" src="/static/deposit.png">
              </div>
            </div>
            <div class="category">
              Total borrowed at <b>{{pool.borrowingRate | percent}}</b>
              <div class="cat-value">{{ loan.debt | avax}}</div>
              <div class="card-subheader"><b>{{ loan.debt | usd}}</b> </div>
            </div>
          </div>

          <md-card-actions class="actions-card">
            <md-button class="md-raised md-primary" style="float:left" @click="showBorrowingPanel=true">Borrow</md-button>
            <div style="width:100%"></div>
            <md-button class="md-raised md-accent" @click="showRepaymentPanel=true">Repay</md-button>
          </md-card-actions>
        </div>
      </div>

      <div class="md-layout-item md-medium-size-25 md-size-25 widget">
        <div class="md-card md-card-stats md-theme-default">
          <div class="md-card-header md-card-header-icon md-card-header-blue" style="height: 90px;">
            <div class="card-icon">
              <div class="card-icon">
                <img class="card-image" src="/static/interests.png">
              </div>
            </div>
            <div class="category">
              Solvency ratio
              <div class="cat-value">{{loan.solvency | percent}}</div>
            </div>
          </div>

          <md-card-content>
            <div class="actions-card solvency-warning" style="padding-top:10px;">
              Keep above <b>120%</b> to avoid liquidation
            </div>
          </md-card-content>

        </div>
      </div>

      <div class="md-layout-item md-medium-size-25 md-size-25 widget">
        <div class="md-card md-card-stats md-theme-default">
          <div class="md-card-header md-card-header-icon md-card-header-blue card-widget">
            <div class="card-icon">
              <div class="card-icon">
                <img class="card-image" src="/static/deposit.png">
              </div>
            </div>
            <div class="category">
              Total value
              <div class="cat-value">{{ loan.totalValue | avax}}</div>
              <div class="card-subheader"><b>{{ loan.totalValue | usd}}</b> </div>
            </div>
          </div>

          <md-card-actions class="actions-card">
            <md-button class="md-raised md-primary" style="float:left; width: 320px;" @click="showFundPanel=true">Add funds</md-button>
            <div style="width:100%"></div>
            <md-button class="md-raised md-accent" style="width: 320px;" @click="showWithdrawPanel=true">Withdraw</md-button>
          </md-card-actions>
        </div>
      </div>

      <md-card style="width: 73%; margin-left:13%">
        <md-card-header>
          <md-card-header-text>
            <div class="md-title">Your assets </div><s></s>
          </md-card-header-text>
        </md-card-header>

        <md-card-content>

          <md-table class="assets">
            <md-table-row>
              <md-table-head>Asset</md-table-head>
              <md-table-head>Price</md-table-head>
              <md-table-head>Balance</md-table-head>
              <md-table-head>Value</md-table-head>
              <md-table-head>Share</md-table-head>
              <md-table-head></md-table-head>
            </md-table-row>

            <md-table-row v-for="a in loan.assets" v-bind:key="a.symbol">
              <md-table-cell>{{a.name}}</md-table-cell>
              <md-table-cell>{{a.price | usd}}</md-table-cell>
              <md-table-cell>{{a.balance | units}}</md-table-cell>
              <md-table-cell>{{a.value | usd}}</md-table-cell>
              <md-table-cell>{{a.share | percent}}</md-table-cell>
              <md-table-cell v-if="a.symbol!='AVX'">
                <md-button class="md-raised md-primary" style="float:left" @click="startInvesting(a.symbol)">Invest</md-button>
                <md-button class="md-raised md-accent" @click="showWithdrawPanel=true">Redeem</md-button>
              </md-table-cell>
            </md-table-row>
          </md-table>
        </md-card-content>

      </md-card>
    </div>





  </div>


</template>


<script>
  import {getPoolStats} from '@/blockchain/pool'
  import {getLoan, createNewLoan, calculateCollateral, borrow, repay, fund, withdraw, invest} from '@/blockchain/loan'
  import State from '@/state'
  import RangeSlider from 'vue-range-slider'
  import 'vue-range-slider/dist/vue-range-slider.css'
  import 'vue-select/dist/vue-select.css';
  import vSelect from 'vue-select'
  import DepositPanel from "./DepositPanel";
  import BorrowPanel from "./BorrowPanel";



  export default {
    name: 'Loan',
    components: {
      RangeSlider, vSelect, DepositPanel, BorrowPanel
    },
    data() {
      return {
        pool: State.pool,
        loan: State.loan,
        borrowAmount: null,
        repayAmount: null,
        borrowLoanAmount: null,
        fundAmount: null,
        withdrawAmount: null,
        selectedAsset: null,
        investAmount: null,
        showBorrowingPanel: false,
        showRepaymentPanel: false,
        showFundPanel: false,
        showWithdrawPanel: false,
        showInvestPanel: false,
        currencies: State.currencies,
        processing: false,
      }
    },
    asyncComputed: {
      async collateral() {
        return await calculateCollateral(this.borrowAmount);
      },

    },
    computed: {
      investmentCost: function() {
        if (this.selectedAsset) {
          let assetPrice = this.loan.assets.reduce((acc, item) =>
            acc + (item.symbol === this.selectedAsset ? item.price : 0)
          , 0);
          return this.investAmount ? this.investAmount * assetPrice : null;
        }
      }
    },
    beforeCreate: async function () {
      await getPoolStats();
      await getLoan();
    },
    methods: {
      toast: function(message) {
        this.$toasted.show(message, {
            theme: "bubble",
            position: "top-center",
            duration: 5000,
            icon: 'sentiment_satisfied_alt'
        });
      },
      createLoan: async function() {
        this.processing = true;
        try {
          await createNewLoan(this.borrowAmount);
          this.toast("A new Smart Loan has been created!");
        } finally {
          this.processing = false;
        }
      },
      borrow: async function() {
        this.processing = true;
        try {
          await borrow(this.borrowLoanAmount);
          this.toast("Funds borrowed!");
        } finally {
          this.processing = false;
        }
      },
      repay: async function() {
        this.processing = true;
        try {
          await repay(this.repayAmount);
          this.toast("Funds repaid!");
        } finally {
          this.processing = false;
        }
      },
      fund: async function() {
        this.processing = true;
        try {
          await fund(this.fundAmount);
          this.toast("Funds added to the loan!");
        } finally {
          this.processing = false;
          this.showFundPanel = false;
        }
      },
      withdraw: async function() {
        this.processing = true;
        try {
          await withdraw(this.withdrawAmount);
          this.toast("Funds withdrawn!");
        } finally {
          this.processing = false;
          this.showWithdrawPanel = false;
        }
      },
      startInvesting: async function(asset) {
        this.selectedAsset = asset;
        this.showInvestPanel = true;
      },
      invest: async function() {
        this.processing = true;
        try {
          await invest(this.selectedAsset, this.investAmount);
          this.toast("Funds invested!");
        } finally {
          this.processing = false;
          this.showInvestPanel = false;
        }
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">

  div.page {
    padding: 40px 20px 0 20px;
    width: 100%;
    height: 800px;
    text-align: center;
    background-color: #F5F5F5;
  }


  .text {
    font-size: 36px;
    padding: 30px 0 30px 0;
  }

  .dinput {
    width: 50px;
    border-bottom: 1px solid gray;
  }

  .slider {
    /* overwrite slider styles */
    width: 500px;
  }

  .v-select {
    min-width: 150px;
    display: inline-block;
  }

  .pool-button {
    border-radius: 30px;
    height: 50px;
    font-size: 14px;
    width: 120px;
    margin-left:20px;
    margin-right:20px;
  }

  .md-dialog {
    max-height: none;
    width: 550px;
    height: 550px;
  }

  .container {
    position: relative;
    text-align: center;
    color: white;
  }

  .image-overlay {
    position: absolute;
    top: 30px;
    left: 40px;
    font-size: 24px;
  }

  .range-slider-fill {
    background-color: #E84F89;
  }

  .vs__clear {
    display: none !important;
  }

  .v-select {
    min-width: 110px;
  }

  .text {
    font-size: 14px;
    height: auto;
    font-style: italic;
    color: gray;
    padding: 16px 16px 16px 16px;
  }

  .md-drawer form {
    padding: 20px;
  }

  .md-dialog.md-theme-default {
    max-width: 768px;
    height: 250px;
    background-color: #f5f5f5;
  }
  .md-dialog-content {
    padding: 20px;
  }

  .collateral-info {
    font-size: 14px;
    color: gray;
    text-align: left;
    margin-top:-20px;
    margin-bottom:20px;
  }

  div.widget {
    margin-bottom: 20px;
    border-radius: 20px;
  }

  .md-card {
    border-radius: 5px;
  }

  div.card-icon {
    float: left;
  }

  .category {
    float:right;
    font-size: 14px;
    color: #999;
    text-align: right;
  }

  .cat-value {
    font-size:28px;
    color: black;
    margin-top: 10px;
    text-align: right;
  }

  .actions-card {
    border-top: 1px solid lightgray;
    height: 55px;
    padding-bottom: 0;
  }

  .solvency-warning {
    color: #999;
    font-style: italic;
  }

  #depositButton .md-ripple {
    background-color: green;
  }

  .md-card-content:last-of-type {
    padding-bottom: 6px;
    line-height: 10px;
  }

  img.card-image {
    height: 64px;
  }

  .card-subheader {
    margin-top: 5px;
  }

  .card-widget {
    height: 95px;
  }

  .actions-card {
    padding-bottom: 10px;
  }

  .collateral-info {
    font-size: 14px;
    color: gray;
    text-align: left;
    margin-top:-15px;
    margin-bottom:20px;
    font-style: italic;
  }


</style>
