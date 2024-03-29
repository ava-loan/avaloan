<template>
  <div class="form-wrapper">
    <CurrencyInput
      v-on:newValue="updateRepay"
      :defaultValue="repayValue"
      :validators="repayValidators"
      :max="debt"
    />
    <div class="ltv" v-html="LTVInfo"></div>
    <div class="ltv-slider-wrapper">
      <Slider
        :min="0"
        :max="ltv"
        :value="calculatedLTV"
        :step="0.001"
        v-on:input="updateRepayFromLTV"
        :validators="ltvValidators"
        :labels="['Safer', 'Riskier']"
      />
    </div>
    <Button label="Repay" :disabled="disabled" :waiting="waiting" v-on:click="submit()"/>
  </div>
</template>


<script>
import {mapActions, mapState} from "vuex";
  import CurrencyInput from "./CurrencyInput";
  import Slider from "./Slider";
  import Button from "./Button";
  import config from "@/config";

  export default {
    name: 'RepayForm',
    components: {
      CurrencyInput,
      Slider,
      Button
    },
    props: {

    },
    data() {
      return {
        repayValue: 0,
        errors: [false, false],
        waiting: false,
        label: '',
        repayValidators: [
          {
            require: (value) => value <= this.debt,
            message: 'Repay amount exceeds borrowed amount'
          }
        ]

      }
    },
    methods: {
      ...mapActions('loan', ['repay']),
      updateRepay(result) {
        this.repayValue = result.value;
        this.errors[0] = result.error;
        this.errors = [...this.errors];

        this.checkLTV(this.calculatedLTV);
      },
      async submit() {
        if (!this.disabled) {
          this.waiting = true;
          this.handleTransaction(this.repay, {amount: this.repayValue})
          .then(() => {
            this.waiting = false;
            this.repayValue = null;
          });
        }
      },
      updateRepayFromLTV(ltv) {
        this.checkLTV(ltv);
        this.repayValue = parseFloat((this.debt - ltv * (this.totalValue - this.debt)).toFixed(2));
      },
      checkLTV(value) {
        this.errors[2] = value > this.maxLTV;
        this.errors = [...this.errors];
      }
    },
    computed: {
      ...mapState('loan', ['loan', 'debt', 'totalValue', 'ltv']),
      calculatedLTV() {
        if (this.repayValue) {
          return (this.debt - this.repayValue) / (this.totalValue - this.debt);
        } else {
          return this.ltv;
        }
      },
      disabled() {
        return this.waiting || this.errors.includes(true) || !this.debt;
      },
      LTVInfo() {
        if (this.calculatedLTV === Number.POSITIVE_INFINITY) {
          return 'Loan fully repaid'
        } else {
          return `LTC: <b>${this.$options.filters.percent(this.calculatedLTV)}</b>`;
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/form-wrapper";
</style>

