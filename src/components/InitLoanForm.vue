<template>
  <div class="init-loan-form-wrapper">
    <div class="title">Collateral</div>
    <CurrencyInput
      v-on:newValue="updateCollateral"
      :defaultValue="collateral"
      :validators="collateralValidators"
    />
    <div class="title">Loan</div>
    <CurrencyInput
      v-on:newValue="updateLoan"
      :defaultValue="loan"
      :validators="loanValidators"
    />
    <div class="solvency">Solvency: <span class="solvency-value">{{calculatedSolvency | percent}}</span></div>
    <div class="solvency-slider">
      <Slider
        :min="minInitialSolvency"
        :max="2.0"
        :value="calculatedSolvency"
        :step="0.01"
        v-on:input="updateLoanFromSolvency"
        :validators="solvencyValidators"
        :labels="['Riskier', 'Safer']"
      />
    </div>
    <button class="btn" :class="[disabled ? 'disabled': '', waiting ? 'waiting': '', 'purple']" @click="borrow()">
      <div class="btn-label">
        Create loan
      </div>
      <vue-loaders-ball-beat color="#FFFFFF" scale="0.5"></vue-loaders-ball-beat>
    </button>
  </div>
</template>


<script>
  import CurrencyInput from "./CurrencyInput";
  import Slider from "./Slider";
  import {mapState, mapActions} from "vuex";
  import {calculateCollateral} from "../utils/calculate";

  const MIN_INITIAL_SOLVENCY = 1.25;
  export default {
    name: 'InitLoanForm',
    props: {
    },
    components: {
      CurrencyInput,
      Slider
    },
    data() {
      return {
        loan: null,
        minInitialSolvency: MIN_INITIAL_SOLVENCY,
        collateral: null,
        waiting: false,
        userChangedLoan: false,
        errors: [false, false],
        collateralValidators: [
          {
            require: value => value <= this.balance,
            message: 'Collateral amount exceeds your account balance'
          },
        ],
        loanValidators: [
          {
            require: value => value <= this.totalDeposited,
            message: 'Loan amount exceeds amount available in the pool'
          }
        ],
        solvencyValidators: [
          {
            require: function(value) { return value >= MIN_INITIAL_SOLVENCY },
            message: 'Minimum initial solvency is 125%'
          }
        ]
      }
    },
    computed: {
      ...mapState('pool', ['totalDeposited']),
      ...mapState('network', ['balance']),
      disabled() {
        return this.waiting || this.errors.includes(true) || !this.loan || !this.collateral;
      },
      calculatedSolvency() {
        if (this.loan && this.collateral) {
          return (this.loan + this.collateral) / this.loan;
        } else {
          return 0;
        }
      }
    },
    methods: {
      ...mapActions('loan', ['createNewLoan']),
      updateLoan(result) {
        this.loan = result.value;
        this.errors[0] = result.error;
        this.errors = [...this.errors];

        this.checkSolvency(this.calculatedSolvency);
      },
      updateCollateral(result) {
        this.errors[1] = result.error;
        this.errors = [...this.errors];

        this.collateral = result.value;

        this.loan = this.defaultLoan(this.collateral)
      },
      async borrow() {
        if (!this.disabled) {
          await this.handleTransaction(this.createNewLoan, {amount: this.loan, collateral: this.collateral}, "waiting");
        }
      },
      defaultCollateral(value) {
        return (value && !isNaN(value)) ? calculateCollateral(value) : 0;
      },
      defaultLoan(value) {
        return (value && !isNaN(value)) ? value * 4 : 0;
      },
      updateLoanFromSolvency(value) {
        this.checkSolvency(value);
        this.loan = parseFloat((this.collateral / (value - 1)).toFixed(2));
      },
      checkSolvency(value) {
        this.errors[3] = value < this.minInitialSolvency;
        this.errors = [...this.errors];
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.init-loan-form-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: $font-size-xl;
  font-weight: bold;
  margin-bottom: 20px;
}

.btn {
  .ball-beat {
    display: none;
  }

  &.disabled {
    opacity: 0.5;
    cursor: initial;
  }

  &.waiting {
    .btn-label {
      visibility: hidden;
      height: 0;
      width: 0;
    }

    .ball-beat {
      display: block;
      margin-top: 7px;
      margin-bottom: 8px;
    }
  }
}

.solvency {
  color: #7d7d7d;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 30px;

  .solvency-value {
    font-weight: 700;
  }
}

.solvency-slider {
  margin-bottom: 50px;
  width: 490px;
}
</style>
<style lang="scss">
.init-loan-form-wrapper {
  .currency-input-wrapper {
    width: 490px;
    margin-bottom: 35px;
  }
}
</style>
