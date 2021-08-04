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
            <div class="md-title">Your deposits:
              <b>
                <ICountUp :endVal="pool.myDeposits"
                          :options="counterOptions" />
              </b>
              ({{pool.myDeposits | usd}})
            </div>
            <div class="md-subhead">
              Interests earned:
              <b>
                <ICountUp :endVal="pool.depositInterests"
                          :options="counterOptions" />
                ({{pool.depositInterests | usd}})
              </b>
            </div>



          </md-card-header-text>

        </md-card-header>

        <md-card-content style="padding-bottom: 0">
          <div style="text-align: center">
            <md-button id="depositButton" class="md-raised md-primary pool-button" @click="showDepositPanel = true">Deposit</md-button>
            <md-button id="withdrawButton" class="md-raised md-accent pool-button" @click="showWithdrawPanel = true">Withdraw</md-button>
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
              <vue-timeline-update v-for="h in depositsHistory"
                theme="light"
                :date=h.time
                :title= $options.filters.full(h.value)
                :description="'<a target=_blank href=https://kovan.etherscan.io/tx/' + h.tx + '>' + h.tx.substr(0,10) + '...' + h.tx.substr(-10) + '</a>'"
                :category=h.type
                :icon="(h.type === 'Deposit' ? 'call_received' : 'call_made')"
                :color= "(h.type === 'Deposit' ? 'green' : 'red')"
              />

            </md-card-content>
          </md-card-expand-content>
        </md-card-expand>

      </md-card>



    <md-drawer class="md-drawer md-right" :md-active.sync="showDepositPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Deposit funds</span>
      </md-toolbar>

      <div class="text">
        Supply funds to the pool to earn interest.
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="depositAmount">Amount in AVAX</label>
            <md-input name="depositAmount" id="depositAmount" v-model="depositAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="makeDeposit()">Deposit</md-button>

      </form>
    </md-drawer>

    <md-drawer class="md-drawer md-right" :md-active.sync="showWithdrawPanel" md-swipeable>
      <md-toolbar class="md-primary">
        <span class="md-title">Withdraw funds</span>
      </md-toolbar>

      <div class="text">
        Withdraw funds to get cash out your earnings.
      </div>

      <form novalidate>
        <div class="form-container">
          <md-field>
            <label for="withdrawAmount">
              Amount in AVAX
              (max: <a @click="withdrawAmount = pool.myDeposits" class="link-button">{{pool.myDeposits | avax}}</a> )
            </label>
            <md-input name="withdrawAmount" id="withdrawAmount" v-model="withdrawAmount"
                      :disabled="processing"/>
          </md-field>
        </div>

        <md-button class="md-primary md-raised pool-button" @click="makeWithdraw()">Withdraw</md-button>

      </form>
    </md-drawer>

  </div>
</template>

<script>
  import {getMyDeposits, sendDeposit, withdraw} from '@/blockchain/pool'
  import State from '@/state'
  import RangeSlider from 'vue-range-slider'
  import 'vue-range-slider/dist/vue-range-slider.css'
  import 'vue-select/dist/vue-select.css';
  import vSelect from 'vue-select'
  import ICountUp from 'vue-countup-v2';

  export default {
    name: 'Pool',
    components: {
      RangeSlider, vSelect, ICountUp
    },
    data() {
      return {
        pool: State.pool,
        showDepositPanel: false,
        showWithdrawPanel: false,
        currencies: State.currencies,
        depositAmount: 0,
        withdrawAmount: 0,
        processing: false,
        counterOptions: {
          separator: '',
          suffix: ' AVAX',
          decimalPlaces: 6
        }
      }
    },
    computed: {
      depositsHistory: function () {
        return this.pool.history.filter(function (event) {
          return event.type === 'Deposit' || event.type === 'Withdrawal'
        })
      }
    },
    methods: {
      updateInterests: async function() {
        console.log("Updating interests");
        await getMyDeposits();
        setTimeout(this.updateInterests, 15000);
      },
      makeDeposit: async function () {
        this.processing = true;
        try {
          await sendDeposit(this.depositAmount);

          let toast = this.$toasted.show("Your deposit has been registered!", {
            theme: "bubble",
            position: "top-center",
            duration: 5000,
            icon: 'sentiment_satisfied_alt'
          });
        } finally {
          this.processing = false;
          this.showDepositPanel = false;
        }
      },
      makeWithdraw: async function () {
        this.processing = true;
        try {
          await withdraw(this.withdrawAmount);

          let toast = this.$toasted.show("You have withdrawn the money!", {
            theme: "bubble",
            position: "top-center",
            duration: 5000,
            icon: 'sentiment_satisfied_alt'
          });
        } finally {
          this.processing = false;
          this.showWithdrawPanel = false;
        }
      }
    },
    beforeMount: function () {
      this.updateInterests();
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

  #withdrawButton .md-ripple {
    background-color: #E10F2B;
  }

  .md-card-actions {
    padding-top: 0;
  }

  .gb-vue-timeline-update .gb-vue-timeline-update__right .gb-vue-timeline-update__description {
    opacity: .54;
    font-size: 14px !important;
    letter-spacing: .01em;
    line-height: 20px;
  }

  a.link-button {
    text-decoration: underline;
    cursor: pointer
  }


</style>

