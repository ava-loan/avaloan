/* eslint-disable */
<template>
  <div>

    <md-dialog :md-active.sync="processing" :md-click-outside-to-close="false">
      <md-dialog-title>Processing transaction</md-dialog-title>

      <md-dialog-content style="text-align: center">


        <md-progress-spinner md-mode="indeterminate"></md-progress-spinner>

        <div>
          Please wait....
        </div>

      </md-dialog-content>
    </md-dialog>



    <md-card>
      <md-card-header>
        <md-card-header-text>
          <div class="md-title">Your loans: <b>{{pool.myBorrowed | usd}}</b> </div>
          <div class="md-subhead">Your have earned: <b>$0.00</b></div>

        </md-card-header-text>

      </md-card-header>

      <md-card-content style="padding-bottom: 0">
        <div style="text-align: center">
          <md-button id="depositButton" class="md-raised md-primary pool-button" @click="showBorrowPanel = true">Borrow</md-button>
          <md-button class="md-raised md-accent pool-button" @click="showRepayPanel = true">Repay</md-button>
        </div>
      </md-card-content>

      <md-card-expand>
        <md-card-actions md-alignment="space-between">
          <div>

          </div>

          <div style="position: absolute; right: 50px; font-weight: 500px;">SHOW HISTORY</div>
          <md-card-expand-trigger>
            <md-button class="md-icon-button">
              <md-icon>keyboard_arrow_down</md-icon>
            </md-button>
          </md-card-expand-trigger>
        </md-card-actions>

        <md-card-expand-content>
          <md-card-content >
            <vue-timeline-update v-for="h in borrowingHistory"
                                 theme="light"
                                 :date=h.time
                                 :title=$options.filters.usd(h.value)
                                 :description="'<a target=_blank href=https://kovan.etherscan.io/tx/' + h.tx + '>' + h.tx.substr(0,10) + '...' + h.tx.substr(-10) + '</a>'"
                                 :category=h.type
                                 :icon="(h.type === 'Borrowing' ? 'call_received' : 'call_made')"
                                 :color= "(h.type === 'Borrowing' ? 'green' : 'red')"
            />

          </md-card-content>
        </md-card-expand-content>
      </md-card-expand>

    </md-card>



    <md-drawer class="md-drawer md-right" :md-active.sync="showBorrowPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Borrow funds</span>
      </md-toolbar>

      <div class="text">
        Borrow funds to start investing.
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="borrowAmount">Amount in ETH</label>
            <md-input name="borrowAmount" id="borrowAmount" v-model="borrowAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="makeBorrowing()">Borrow</md-button>

      </form>
    </md-drawer>

    <md-drawer class="md-drawer md-right" :md-active.sync="showRepayPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Repay loans</span>
      </md-toolbar>

      <div class="text">
        Repay funds to reduce your debt.
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="repayAmount">
              Amount in USD
              (max: <a @click="repayAmount = pool.myBorrowed" class="link-button">{{pool.myBorrowed | usd}}</a> )
            </label>
            <md-input name="repayAmount" id="repayAmount" v-model="repayAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="makeRepayment()">Repay</md-button>

      </form>
    </md-drawer>

  </div>
</template>

<script>
  import {getMyLoans, borrow, repay} from '@/blockchain/pool'
  import State from '@/state'
  import RangeSlider from 'vue-range-slider'
  import 'vue-range-slider/dist/vue-range-slider.css'
  import 'vue-select/dist/vue-select.css';
  import vSelect from 'vue-select'

  export default {
    name: 'Pool',
    components: {
      RangeSlider, vSelect
    },
    data() {
      return {
        pool: State.pool,
        showBorrowPanel: false,
        showRepayPanel: false,
        currencies: State.currencies,
        borrowAmount: 0,
        repayAmount: 0,
        processing: false,
      }
    },
    beforeCreate: async function () {
      await getMyLoans();

    },
    computed: {
      borrowingHistory: function () {
        return this.pool.history.filter(function (event) {
          return event.type === 'Borrowing' || event.type === 'Repayment'
        })
      }
    },
    methods: {
      makeBorrowing: async function () {
        this.processing = true;
        try {
          await borrow(this.borrowAmount);

          let toast = this.$toasted.show("Your loan has been registered!", {
            theme: "bubble",
            position: "top-center",
            duration: 5000,
            icon: 'sentiment_satisfied_alt'
          });
        } finally {
          this.processing = false;
          this.showBorrowPanel = false;
        }
      },
      makeRepayment: async function () {
        this.processing = true;
        try {
          await repay(this.repayAmount);

          let toast = this.$toasted.show("You have repaid the debt!", {
            theme: "bubble",
            position: "top-center",
            duration: 5000,
            icon: 'sentiment_satisfied_alt'
          });
        } finally {
          this.processing = false;
          this.showRepayPanel = false;
        }
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">

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
    height: 25px;
  }

  .solvency-warning {
    color: #999;
    font-style: italic;
  }

  #depositButton .md-ripple {
    background-color: #81C924;
  }

  a.link-button {
    text-decoration: underline;
    cursor: pointer
  }


</style>
