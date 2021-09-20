<template>
  <div class="invest container">
    <div v-if="!isLoanAlreadyCreated">
      <Bar>
        <Value label="Available in pool" 
          :primary="{value: getAvailable, type: 'avax', showIcon: true}" 
          :secondary="{value: toUSD(getAvailable), type: 'usd'}" 
          :flexDirection="isMobile ? 'row' : 'column'" />
        <Value label="Current APY" :primary="{value: borrowingRate, type: 'percent'}"
          :flexDirection="isMobile ? 'row' : 'column'" />
      </Bar>    
      <Block class="block" :bordered="true">
        <InitLoan/>
      </Block>
    </div>
    <SmartLoan v-else/>
  </div>
</template>


<script>
  import { mapState, mapGetters } from 'vuex';
  import InitLoan from "@/components/InitLoan.vue";
  import SmartLoan from "@/components/SmartLoan.vue";
  import Bar from "@/components/Bar.vue";
  import Block from "@/components/Block.vue";
  import Value from "@/components/Value.vue";

  export default {
    name: 'Invest',
    components: {
      InitLoan,
      SmartLoan,
      Bar,
      Block,
      Value
    },
    data() {
      return {
      }
    },
    computed: {
      ...mapState('loan', ['isLoanAlreadyCreated']),
      ...mapState('pool', ['borrowingRate']),
      ...mapGetters('pool', ['getAvailable'])
    },
    methods: {
    }
  }
</script>

<style lang="scss" scoped>
.block {
  margin-top: 30px;
}

.bars {
  display: flex;
  justify-content: space-between;
}

.bars > * {
  width: 47.5%;
}
</style>
<style lang="scss">
@import "~@/styles/variables";

.invest {
  .currency-input-wrapper {
    width: 490px;
  }
}
</style>
