<template>
  <div class="form-wrapper">
    <CurrencyInput
      v-on:newValue="updateWithdraw"
      :defaultValue="withdrawValue"
      :validators="withdrawValidators"
    />
    <div class="ltv">LTC: <b>{{ltvInfo}}</b></div>
    <div class="ltv-slider-wrapper">
      <Slider
        :min="ltv"
        :max="maxLTV"
        :value="calculatedLTV"
        :step="0.001"
        v-on:input="updateWithdrawFromLTV"
        :validators="ltvValidators"
        :labels="['Safer', 'Riskier']"
      />
    </div>
    <Button label="Withdraw" :disabled="disabled" :waiting="waiting" v-on:click="submit()"/>
  </div>
</template>


<script>
import {mapActions, mapState} from "vuex";
  import CurrencyInput from "./CurrencyInput";
  import Slider from "./Slider";
  import Button from "./Button";

  export default {
    name: 'WithdrawForm',
    components: {
      CurrencyInput,
      Slider,
      Button
    },
    props: {

    },
    data() {
      return {
        withdrawValue: 0,
        errors: [false, false],
        waiting: false,
        label: '',
        withdrawValidators: [
          {
            require: (value) => value <= this.balance,
            message: 'Withdraw amount exceeds user balance'
          }
        ],
      }
    },
    methods: {
      ...mapActions('loan', ['withdraw']),
      updateWithdraw(result) {
        this.withdrawValue = result.value;
        this.errors[0] = result.error;
        this.errors = [...this.errors];

        this.checkLTV(this.calculatedLTV);
      },
      async submit() {
        if (!this.disabled) {
          this.waiting = true;
          this.handleTransaction(this.withdraw, {amount: this.withdrawValue})
          .then(
            () => {
              this.waiting = false;
              this.withdrawValue = null;
            }
          );
        }
      },
      updateWithdrawFromLTV(ltv) {
        this.checkLTV(ltv);
        this.withdrawValue = parseFloat((this.totalValue - (this.debt * ( 1 / ltv + 1))).toFixed(2));
      },
      checkLTV(value) {
        this.errors[2] = value > this.maxLTV;
        this.errors = [...this.errors];
      }
    },
    computed: {
      ...mapState('loan', ['loan', 'debt', 'totalValue', 'ltv']),
      ...mapState('network', ['balance']),
      calculatedLTV() {
        if (this.withdrawValue) {
          return this.debt / (this.totalValue - this.debt - this.withdrawValue);
        } else {
          return this.ltv;
        }
      },
      disabled() {
        return this.waiting || this.errors.includes(true) || !this.debt;
      },
      ltvInfo() {
        return this.$options.filters.percent(this.calculatedLTV);
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/form-wrapper";
</style>

