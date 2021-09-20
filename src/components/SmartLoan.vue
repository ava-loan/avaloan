<template>
  <div class="smart-loan container">
    <Bar>
      <div>
        <Value label="Borrowed" 
          :primary="{value: debt, type: 'avax', showIcon: true}" 
          :secondary="{value: toUSD(debt), type: 'usd'}"
          :flexDirection="isMobile ? 'row' : 'column'" />
          <div class="borrow-buttons">
            <img @click="toggleBorrowBlock" src="src/assets/icons/transfer.svg"/>
          </div>
      </div>
      <div class="solvency-value">
        <div class="label"> 
          Solvency
        </div>
        <div class="solvency-gauge">
          <SolvencyGauge />
        </div>
      </div>  
      <div>
        <Value label="Collateral" 
          :primary="{value: collateral, type: 'avax', showIcon: true}"
          :secondary="{value: toUSD(collateral), type: 'usd'}" 
          :flexDirection="isMobile ? 'row' : 'column'" />
          <div class="fund-buttons">
            <img @click="toggleSolvencyInput" src="src/assets/icons/transfer.svg"/>
          </div>
      </div>
    </Bar>   
    <Block v-if="showSolvencyInput" class="block solvency-block" :bordered="true">
      <SolvencyGauge />
      <Tabs>
        <Tab title="Add collateral" imgActive="add-deposit-active" img="add-deposit" imgPosition="left">
          <CurrencyInput label="Add" v-on:submitValue="fundValue" :waiting="processing" flexDirection="column" :style="{'width': '490px'}"/>
        </Tab>
        <Tab title="Reduce collateral" imgActive="withdraw-deposit-active" img="withdraw-deposit" imgPosition="right">
          <CurrencyInput label="Reduce" v-on:submitValue="withdrawValue" :waiting="processing" flexDirection="column" :style="{'width': '490px'}" /> 
        </Tab>
      </Tabs>
    </Block>  
    <Block v-if="showBorrowBlock" class="block solvency-block" :bordered="true">
      <SolvencyGauge />
      <Tabs>
        <Tab title="Borrow" imgActive="add-deposit-active" img="add-deposit" imgPosition="left">
          <CurrencyInput label="Borrow" v-on:submitValue="borrowValue" :waiting="processing" flexDirection="column" :style="{'width': '490px'}"/>
        </Tab>
        <Tab title="Repay" imgActive="withdraw-deposit-active" img="withdraw-deposit" imgPosition="right">
          <CurrencyInput label="Repay" v-on:submitValue="repayValue" :waiting="processing" flexDirection="column" :style="{'width': '490px'}" /> 
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
  import SolvencyGauge from "@/components/SolvencyGauge.vue";
  import { VueSvgGauge } from 'vue-svg-gauge'
  import CurrencyInput from "@/components/CurrencyInput.vue";
  import { mapState, mapActions } from "vuex";
  import { formatUnits } from "@/utils/calculate";

  export default {
  name: 'SmartLoan',
  data() {
    return {
      showSolvencyInput: false,
      showBorrowBlock: false,
    }
  },
  methods: {
    
  },
  components: {
    Bar,
    Value,
    AssetsList,
    Block,
    CurrencyInput,
    Tab,
    Tabs,
    VueSvgGauge,
    SolvencyGauge
  },
  computed: {
    ...mapState('loan', ['debt', 'totalValue', 'solvency', 'assets', 'processing']),
    collateral() {
      return this.totalValue - this.debt;
    }
  },
  methods: {
    ...mapActions('loan', ['fund', 'withdraw', 'borrow', 'repay']),
    toggleSolvencyInput() {
      this.showBorrowBlock = false;
      this.showSolvencyInput = !this.showSolvencyInput;
    },
    toggleBorrowBlock() {
      this.showSolvencyInput = false;
      this.showBorrowBlock = !this.showBorrowBlock;
    },
    async fundValue(value) {
      await this.fund({amount: value});
    },
    async withdrawValue(value) {
      await this.withdraw({amount: value});
    },
    async borrowValue(value) {
      await this.borrow({amount: value});
    },
    async repayValue(value) {
      await this.repay({amount: value});
    },
  }
}
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.block  {
  margin-top: 30px;
}

.borrow-buttons, .fund-buttons {
  display: flex;
  padding-left: 20px;
  padding-right: 20px;
  margin-top: 10px;
  justify-content: flex-end;
  position: absolute;
  transform: translate(117px, -83px);

  @media screen and (min-width: $md) {
    justify-content: space-around;
    position: initial;
    transform: initial;
  }

  img {
    height: 44px;
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
    margin-top: 0.5rem;

    .gauge {
      width: 80px;

        @media screen and (min-width: $md) {
          width: 120px;
      }
    }
  }
}

.solvency-block {
  .gauge {
    width: 23%;
    margin-bottom: 0.5rem;
  }
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
      margin-top: 0; 
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

  .solvency-block {
    .tab-button {
      @media screen and (min-width: $md) {
        width: 330px !important;
      }
    } 
  }
}

</style>

