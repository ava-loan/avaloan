<template>
  <div class="invest container">
    <div v-if="!isLoanAlreadyCreated">
      <Bar>
        <Value label="Available in pool"
          :primary="{value: getAvailable, type: 'avax', showIcon: true}"
          :secondary="{value: avaxToUSD(getAvailable), type: 'usd'}" />
        <Value label="Current APY" :primary="{value: borrowingRate, type: 'percent'}" />
      </Bar>
      <div class="info-bubble-wrapper">
        <div class="info-bubble">
          <img src="src/assets/icons/info.svg"/>
          <div>
            Create a loan to start your investment adventure. <br/>
            Remember that initial solvency cannot be less than <b>125%</b>.
          </div>
        </div>
      </div>
      <Block class="block" :bordered="true">
        <InitLoanForm />
      </Block>
    </div>
    <SmartLoan v-else/>
  </div>
</template>


<script>
  import { mapState, mapGetters } from 'vuex';
  import InitLoanForm from "@/components/InitLoanForm.vue";
  import SmartLoan from "@/components/SmartLoan.vue";
  import Bar from "@/components/Bar.vue";
  import Block from "@/components/Block.vue";
  import Value from "@/components/Value.vue";

  export default {
    name: 'Invest',
    components: {
      InitLoanForm,
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

.info-bubble-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 30px;

  .info-bubble {
    background-image: url("../assets/icons/bubble.svg");
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 23px 50px 45px 50px;
    font-weight: 500;
    color: #7d7d7d;
    line-height: 24px;

    img {
      margin-right: 20px;
    }
  }
}

</style>

