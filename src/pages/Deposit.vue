<template>
  <div class="deposit container">
    <Bar>
      <Value label="Your deposits" 
        :primary="{value: userDeposited, type: 'avax', showIcon: true}" 
        :secondary="{value: toUSD(userDeposited), type: 'usd'}"
        :flexDirection="isMobile ? 'row' : 'column'" />
      <Value label="Current APR" 
        :primary="{value: depositRate, type: 'percent'}"
        :flexDirection="isMobile ? 'row' : 'column'" />
      <Value label="All deposits" 
        :primary="{value: totalDeposited, type: 'avax', showIcon: true}"
        :secondary="{value: toUSD(totalDeposited), type: 'usd'}" 
        :flexDirection="isMobile ? 'row' : 'column'" />
    </Bar>    
    <Block class="block" :bordered="true">
      <Tabs>
        <Tab title="Deposit" imgActive="add-deposit-active" img="add-deposit" imgPosition="left" titleWidth="100px">
          <CurrencyInput label="Deposit" v-on:submitValue="depositValue" :waiting="waitingForDeposit" flexDirection="column"/>
        </Tab>
        <Tab title="Withdraw" imgActive="withdraw-deposit-active" img="withdraw-deposit" imgPosition="right" titleWidth="140px">
          <CurrencyInput label="Withdraw" v-on:submitValue="withdrawValue" :waiting="waitingForDeposit" flexDirection="column" /> 
        </Tab>
      </Tabs>
    </Block>  
    <Block class="block" background="rgba(255, 255, 255, 0.3)" v-if="(history && history.length > 0)">
      <div class="history-title">Deposits history</div>
      <div>
        <Chart :dataPoints="chartPoints" :maxY="maximumDeposit" stepped="before" class="deposit-chart"/>
      </div>
      <HistoryList :items="history" title="Last deposits" class="history-list"/>
    </Block>
  </div>
</template>

<script>
  import CurrencyInput from "@/components/CurrencyInput.vue";
  import Tabs from "@/components/Tabs.vue";
  import Tab from "@/components/Tab.vue";
  import Value from "@/components/Value.vue";
  import Block from "@/components/Block.vue";
  import Bar from "@/components/Bar.vue";
  import HistoryList from "@/components/HistoryList.vue";
  import Chart from "@/components/Chart.vue";
  import { mapState, mapActions } from 'vuex';

  export default {
    name: 'Deposit',
    components: {
      CurrencyInput, 
      Tabs, 
      Tab,
      Value,
      Block,
      Bar,
      HistoryList,
      Chart
    },
    data() {
      return {
        maximumDeposit: 0
      }
    },
    computed: {
      ...mapState('pool', ['userDeposited', 'depositRate', 'totalDeposited', 'history', 'waitingForDeposit']),
      chartPoints() {
        if (this.history == null || this.history.length == 0) {
          return [];
        }

        let currentDeposit = 0;
        let maxDeposit = 0;

        let dataPoints = this.history.slice().reverse().map(
          (e) => {
            let value = e.type == "Deposit" ? e.value : -e.value;
            currentDeposit += value;

            if (currentDeposit > maxDeposit) maxDeposit = currentDeposit;

            return {
              x: e.time.getTime(),
              y: currentDeposit
            }
          }
        );

        dataPoints.push(
          {
            x: Date.now(),
            y: dataPoints.slice(-1)[0].y
          }
        )

        this.maximumDeposit = maxDeposit;

        return dataPoints;
      }
    },
    methods: {
      ...mapActions('pool', ['sendDeposit', 'withdraw']),
      async depositValue(value) {
        await this.sendDeposit({amount: value});
      },
      async withdrawValue(value) {
        await this.withdraw({amount: value});
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.block, .history-list, .deposit-chart {
  margin-top: 30px;
}

.history-block {
  padding: 25px 53.5px 20px;
  border-radius: 25px;
  box-shadow: 7px 7px 30px 0 rgba(191, 188, 255, 0.5);
  background-color: rgba(255, 255, 255, 0.3);
}

.history-title {
  font-size: $font-size-mlg;
  color: #7d7d7d;
  font-weight: 500;
}

</style>
<style lang="scss">
@import "~@/styles/variables";

.deposit {
  .currency-input-wrapper {
    width: 490px;
  }
}
</style>
