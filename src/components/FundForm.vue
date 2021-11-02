<template>
  <div class="form-wrapper">
    <CurrencyInput
      v-on:newValue="updateFund"
      :defaultValue="fundValue"
      :validators="fundValidators"
    />
    <div class="ltv">LTV: <b>{{LTVInfo}}</b></div>
    <div class="ltv-slider-wrapper">
      <Slider
        :min="LTV"
        :max="2"
        :value="calculatedLTV"
        :step="0.001"
        v-on:input="updateFundFromLTV"
        :validators="ltvValidators"
        :labels="['Riskier', 'Safer']"
      />
    </div>
    <Button label="Fund" :disabled="disabled" :waiting="waiting" v-on:click="submit()"/>
  </div>
</template>


<script>
import {mapActions, mapState} from "vuex";
  import CurrencyInput from "./CurrencyInput";
  import Slider from "./Slider";
  import Button from "./Button";
  import config from "@/config";

  export default {
    name: 'FundForm',
    components: {
      CurrencyInput,
      Slider,
      Button
    },
    props: {

    },
    data() {
      return {
        fundValue: 0,
        errors: [false, false],
        waiting: false,
        label: '',
        fundValidators: [
          {
            require: (value) => value <= this.balance,
            message: 'Fund amount exceeds user balance'
          }
        ],
      }
    },
    methods: {
      ...mapActions('loan', ['fund']),
      updateFund(result) {
        this.fundValue = result.value;
        this.errors[0] = result.error;
        this.errors = [...this.errors];

        this.checkLTV(this.calculatedLTV);
      },
      async submit() {
        if (!this.disabled) {
          this.waiting = true;
          this.handleTransaction(this.fund, {amount: this.fundValue})
          .then(
            () => {
              this.waiting = false;
              this.fundValue = null;
            }
          );
        }
      },
      updateFundFromLTV(LTV) {
        this.checkLTV(LTV);
        this.fundValue = parseFloat(((this.debt * LTV - this.totalValue)).toFixed(2));
      },
      checkLTV(value) {
        this.errors[2] = value > this.maxLTV;
        this.errors = [...this.errors];
      }
    },
    computed: {
      ...mapState('loan', ['loan', 'debt', 'totalValue', 'LTV']),
      ...mapState('network', ['balance']),
      calculatedLTV() {
        if (this.fundValue) {
          return (this.totalValue + this.fundValue) / (this.debt);
        } else {
          return this.LTV;
        }
      },
      disabled() {
        return this.waiting || this.errors.includes(true) || !this.debt;
      },
      LTVInfo() {
        return this.$options.filters.percent(this.calculatedLTV);
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/form-wrapper";
</style>

