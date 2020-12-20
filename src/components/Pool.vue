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

    <div class="md-layout">

        <div class="md-layout-item md-medium-size-25 md-size-25 widget"></div>


          <div class="md-layout-item md-medium-size-25 md-size-25 widget">
            <div class="md-card md-card-stats md-theme-default">
              <div class="md-card-header md-card-header-icon md-card-header-blue" style="height: 90px;">
                <div class="card-icon">
                  <div class="card-icon">
                    <img class="card-image" src="/static/deposit.png">
                  </div>
                </div>
                <div class="category">
                  Total deposited
                  <div class="cat-value">{{ pool.totalDeposited | avax}}</div>
                  <div class="card-subheader"><b>{{ pool.totalDeposited | usd}}</b> </div>
                </div>
              </div>

              <md-card-content>
                <div class="actions-card solvency-warning" style="padding-top:10px;">
                  Earning <b>{{pool.effectiveRate | percent}}</b> effective rate
                </div>
              </md-card-content>
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
                  Deposit rate
                  <div class="cat-value">{{pool.depositRate | percent}}</div>
                </div>
              </div>

              <md-card-content>
                <div class="actions-card solvency-warning" style="padding-top:10px;">
                  <b>APY</b> compounding every second
                </div>
              </md-card-content>

            </div>
          </div>

          <!--<div class="md-layout-item md-medium-size-25 md-size-25 widget">-->
            <!--<div class="md-card md-card-stats md-theme-default">-->
              <!--<div class="md-card-header md-card-header-icon md-card-header-blue" style="height: 90px;">-->
                <!--<div class="card-icon">-->
                  <!--<img class="card-image" src="/static/loan.png">-->
                <!--</div>-->
                <!--<div class="category">-->
                  <!--Total borrowed-->
                  <!--<div class="cat-value">{{ pool.totalBorrowed | usd}}</div>-->
                <!--</div>-->
              <!--</div>-->

              <!--<md-card-content>-->
                <!--<div class="actions-card solvency-warning" style="padding-top:10px;">-->
                  <!--Earning <b>{{pool.effectiveRate | percent}}</b> effective rate-->
                <!--</div>-->
              <!--</md-card-content>-->
            <!--</div>-->
          <!--</div>-->

          <!--<div class="md-layout-item md-medium-size-25 md-size-25 widget">-->
            <!--<div class="md-card md-card-stats md-theme-default">-->
              <!--<div class="md-card-header md-card-header-icon md-card-header-blue" style="height: 90px;">-->
                <!--<div class="card-icon">-->
                  <!--<div class="card-icon">-->
                    <!--<img class="card-image" src="/static/interests.png">-->
                  <!--</div>-->
                <!--</div>-->
                <!--<div class="category">-->
                  <!--Borrowing rate-->
                  <!--<div class="cat-value">{{ pool.borrowingRate | percent }}</div>-->
                <!--</div>-->
              <!--</div>-->

              <!--<md-card-content>-->
                <!--<div class="actions-card solvency-warning" style="padding-top:10px;">-->
                  <!--<b>APR</b> compounding every second-->
                <!--</div>-->
              <!--</md-card-content>-->

            <!--</div>-->
          <!--</div>-->

        <div class="md-layout-item md-medium-size-25 md-size-25 widget"></div>
        <div class="md-layout-item md-medium-size-25 md-size-25 widget"></div>

        <deposit-panel class="md-layout-item md-medium-size-50 md-size-50 widget"></deposit-panel>

        <!--<borrow-panel class="md-layout-item md-medium-size-50 md-size-50 widget"></borrow-panel>-->

        </div>



      </div>


</template>

<script>
  import {getPoolStats} from '@/blockchain/pool'
  import State from '@/state'
  import RangeSlider from 'vue-range-slider'
  import 'vue-range-slider/dist/vue-range-slider.css'
  import 'vue-select/dist/vue-select.css';
  import vSelect from 'vue-select'
  import DepositPanel from "./DepositPanel";
  import BorrowPanel from "./BorrowPanel";

  export default {
    name: 'Pool',
    components: {
      RangeSlider, vSelect, DepositPanel, BorrowPanel
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
      }
    },
    beforeCreate: async function () {
      await getPoolStats();
    },
    methods: {

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
    height: 25px;
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


</style>
