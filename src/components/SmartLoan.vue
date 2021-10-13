<template>
  <div class="smart-loan container">
    <Bar>
      <div>
        <Value label="Loan"
          :primary="{value: debt, type: 'avax', showIcon: true}"
          :secondary="{value: toUSD(debt), type: 'usd'}"
          :flexDirection="isMobile ? 'row' : 'column'" />
          <div class="borrow-buttons">
            <img @click="showBorrowBlock(0)" src="src/assets/icons/plus.svg" class="plus"/>
            <img src="src/assets/icons/slash-small.svg"/>
            <img @click="showBorrowBlock(1)" src="src/assets/icons/minus.svg" class="minus"/>
          </div>
      </div>
      <div class="solvency-value">
        <div class="label">
          Solvency
        </div>
        <div class="solvency-gauge">
          <SolvencyBar />
        </div>
      </div>
      <div>
        <Value label="Collateral"
          :primary="{value: collateral, type: 'avax', showIcon: true}"
          :secondary="{value: toUSD(collateral), type: 'usd'}"
          :flexDirection="isMobile ? 'row' : 'column'" />
          <div class="fund-buttons">
            <img @click="showCollateralBlock(0)" src="src/assets/icons/plus.svg" class="plus"/>
            <img src="src/assets/icons/slash-small.svg"/>
            <img @click="showCollateralBlock(1)" src="src/assets/icons/minus.svg" class="minus"/>
          </div>
      </div>
    </Bar>
    <Block v-if="borrowBlock" class="block borrow-block" :bordered="true">
      <img @click="borrowBlock = false" src="src/assets/icons/cross.svg" class="cross" />
      <Tabs :openTabIndex="tabIndex">
        <Tab title="Borrow" imgActive="add-deposit-active" img="add-deposit" imgPosition="left">
          <CurrencyForm
            label="Borrow"
            v-on:submitValue="borrowValue"
            :waiting="waitingForBorrow"
            flexDirection="column"
            :style="{'width': '490px'}"
            :validators="[
              {require: value => value <= getAvailable, message: 'Borrow amount exceeds amount available in the pool'},
              {require: value => calculateSolvency(0, value) >= 1.2, message: 'New solvency ratio is below acceptable level'},
            ]"
            :info="value => `New solvency ratio: <b>${(calculateSolvency(0, value) * 100).toFixed(1)}%</b>`"
          />
        </Tab>
        <Tab title="Repay" imgActive="withdraw-deposit-active" img="withdraw-deposit" imgPosition="right">
          <CurrencyForm
            label="Repay"
            v-on:submitValue="repayValue"
            :waiting="waitingForRepay"
            flexDirection="column"
            :style="{'width': '490px'}"
            :validators="[
              {require: (value) => value <= debt, message: 'Repay amount exceeds borrowed amount'}
            ]"
            :info="value => `New solvency ratio: <b>${(calculateSolvency(0, -value) * 100).toFixed(1)}%</b>`"
          />
        </Tab>
      </Tabs>
    </Block>
    <Block v-if="collateralBlock" class="block collateral-block" :bordered="true">
      <img @click="collateralBlock = false" src="src/assets/icons/cross.svg" class="cross" />
      <Tabs :openTabIndex="tabIndex">
        <Tab title="Add collateral" imgActive="add-deposit-active" img="add-deposit" imgPosition="left">
          <CurrencyForm
            label="Add"
            v-on:submitValue="fundValue"
            :waiting="waitingForFund"
            flexDirection="column"
            :style="{'width': '490px'}"
            :validators="[
              {require: (value) => value <= balance, message: 'Repay amount exceeds user balance'}
            ]"
            :info="value => `New solvency ratio: <b>${(calculateSolvency(value, 0) * 100).toFixed(1)}%</b>`"
          />
        </Tab>
        <Tab title="Reduce collateral" imgActive="withdraw-deposit-active" img="withdraw-deposit" imgPosition="right">
          <CurrencyForm
            label="Reduce"
            v-on:submitValue="withdrawValue"
            :waiting="waitingForWithdraw"
            flexDirection="column"
            :style="{'width': '490px'}"
            :validators="[
              {require: value => calculateSolvency(-value, 0) >= 1.2, message: 'New solvency ratio is below acceptable level'},
            ]"
            :info="value => `New solvency ratio: <b>${(calculateSolvency(-value, 0) * 100).toFixed(1)}%</b>`"
          />
        </Tab>
      </Tabs>
    </Block>
    <Block class="block" :bordered="true" >
      <AssetsList :assets="assets" class="assets-list"/>
    </Block>
  </div>
</template>


<script>
  import Bar from "@/components/Bar.vue";
  import Value from "@/components/Value.vue";
  import AssetsList from "@/components/AssetsList.vue";
  import Block from "@/components/Block.vue";
  import Tabs from "@/components/Tabs.vue";
  import Tab from "@/components/Tab.vue";
  import SolvencyBar from "@/components/SolvencyBar.vue";
  import CurrencyForm from "@/components/CurrencyForm.vue";
  import {mapState, mapActions, mapGetters} from "vuex";

  export default {
  name: 'SmartLoan',
  data() {
    return {
      borrowBlock: false,
      collateralBlock: false,
      tabIndex: 0,
      waitingForWithdraw: false,
      waitingForFund: false,
      waitingForBorrow: false,
      waitingForRepay: false
    }
  },
  components: {
    Bar,
    Value,
    AssetsList,
    Block,
    CurrencyForm,
    Tab,
    Tabs,
    SolvencyBar
  },
  computed: {
    ...mapState('loan', ['loan', 'debt', 'totalValue', 'solvency', 'assets']),
    ...mapState('pool', ['userDeposited']),
    ...mapState('network', ['balance']),
    ...mapGetters('pool', ['getAvailable']),
    collateral() {
      return this.totalValue - this.debt;
    }
  },
  methods: {
    ...mapActions('loan', ['fund', 'withdraw', 'borrow', 'repay']),
    showBorrowBlock(tabIndex) {
      this.tabIndex = tabIndex;
      this.collateralBlock = false;
      this.borrowBlock = true;
    },
    showCollateralBlock(tabIndex) {
      this.tabIndex = tabIndex;
      this.borrowBlock = false;
      this.collateralBlock = true;
    },
    async fundValue(value) {
      await this.handleTransaction(this.fund, {amount: value}, "waitingForFund");
    },
    async withdrawValue(value) {
      await this.handleTransaction(this.withdraw, {amount: value}, "waitingForWithdraw");
    },
    async borrowValue(value) {
      await this.handleTransaction(this.borrow, {amount: value}, "waitingForBorrow");
    },
    async repayValue(value) {
      await this.handleTransaction(this.repay, {amount: value}, "waitingForRepay");
    },
    calculateSolvency(collateral, debt) {
      return (this.totalValue + (!isNaN(collateral) ? collateral : 0) + (!isNaN(debt) ? debt : 0))
          / (this.debt + (!isNaN(debt) ? debt : 0));
    }
  }
}
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.block  {
  margin-top: 30px;
}

.block-title {
  margin-top: 15px;
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: bold;
}

.borrow-buttons, .fund-buttons {
  display: flex;
  padding-left: 50px;
  padding-right: 50px;
  margin-top: 10px;
  justify-content: flex-end;
  position: absolute;
  transform: translate(117px, -83px);

  @media screen and (min-width: $md) {
    justify-content: center;
    position: initial;
    transform: initial;
  }

  .plus, .minus {
    height: 24px;
    cursor: pointer;
    opacity: 0.7;
    transition: transform .4s ease-in-out;

    &:hover {
      opacity: 1;
      transform: scale(1.05);
    }
  }
}

.solvency-value {
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media screen and (min-width: $md) {
    display: block;
  }

  .solvency-gauge {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 12px;

    .gauge {
      width: 80px;

        @media screen and (min-width: $md) {
          width: 120px;
      }
    }
  }
}

.collateral-block, .borrow-block {
  &:before {
    position: absolute;
    transform: rotate(45deg);
    content: " ";
    width: 20px;
    height: 20px;
    background: white;
    top: -13px;
    border-radius: 3px;
    border-style: solid;
    border-width: 4px 0 0 4px;
  }
}

.borrow-block {
  &:before {
    left: 200px;
    border-color: #C8C8FF;
  }
}

.collateral-block {
  &:before {
    left: 582px;
    border-color: #DFCDDB;
  }
}

.cross {
  cursor: pointer;
  position: absolute;
  right: 20px;
  top: 20px;
}
</style>

<style lang="scss">
@import "~@/styles/variables";
.smart-loan {
  .currency-input-wrapper {
    margin-top: 2rem;
    justify-content: space-between;

    .input-wrapper {
      margin-bottom: 24px;

      @media screen and (min-width: $md) {
        margin-bottom: 0;
      }
    }

    @media screen and (min-width: $md) {
      margin-top: 0px;
      width: 500px;
    }
  }

  .value-wrapper {
    height: 4.8rem;

    .label {
      text-align: start;

      @media screen and (min-width: $md) {
        text-align: center;
      }
    }
  }

  .collateral-block {
    .tab-button {
      @media screen and (min-width: $md) {
        width: 330px !important;
      }
    }
  }
}

</style>

