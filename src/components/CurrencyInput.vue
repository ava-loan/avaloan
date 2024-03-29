<template>
  <div class="currency-input-wrapper">
    <div class="input-wrapper"
         :style="{ 'margin-top': flexDirection === 'column-reverse' ? '40px' : '0'}"
          @click="$refs.input.focus()">
      <input type="number" ref="input" v-model.number="value" step='0.01' placeholder="0" min="0" max="999999">
      <div class="converted">
        <div v-if="value && (value !== 0)">
          ~ {{ price * avaxToUSD(value) | usd}}
        </div>
      </div>
      <div v-if="max" class="max-wrapper" @click.stop="value = max">
        <div class="max">MAX</div>
      </div>
      <div class="logo-wrapper">
        <img class="logo" :src="`https://cdn.redstone.finance/symbols/${symbol.toLowerCase()}.${asset.logoExt ? asset.logoExt : 'svg'}`"/>
        <span v-if="!isMobile" class="symbol">{{ symbol }}</span>
      </div>
    </div>
    <div class="info"
         v-if="!error"
         :style="{'order': flexDirection === 'row' ? 1 : ''}">
      <div
        v-if="info && value && !isNaN(value)"
        v-html="info(value)"></div>
    </div>
    <div class="warning"
         v-if="!error && warning">
      <span>
        <img src="src/assets/icons/warning.svg"/>
        {{warning}}
      </span>
    </div>
    <div class="error"
         v-if="error"
         :style="{'order': flexDirection === 'row' ? 1 : ''}">
      <span>
        <img src="src/assets/icons/error.svg"/>
        {{error}}
      </span>
    </div>
  </div>
</template>


<script>
import config from "@/config";

  export default {
    name: 'CurrencyInput',
    props: {
      price: { type: Number, default: 1 },
      max: { type: Number, default: null },
      symbol: { type: String, default: 'AVAX' },
      flexDirection: { type: String, default: 'column'},
      validators: {
        type: Array, default: () => []
      },
      warnings: {
        type: Array, default: () => []
      },
      //TODO: make an array like in validators
      info: { type: Function, default: null },
      defaultValue: null,
      waiting: false
    },
    data() {
      return {
        error: '',
        warning: '',
        value: null,
        defaultValidators: [],
        asset: config.ASSETS_CONFIG[this.symbol]
      }
    },
    created() {
      this.defaultValidators.push(this.nonNegativeValidator);
    },
    watch: {
      value: function (newValue) {
        this.runChecks(newValue);
      },
      defaultValue: function(newValue) {
        this.value = newValue;
      },
      warnings: function() {
        this.checkWarnings(this.value);
      },
      validators: function() {
        this.checkErrors(this.value);
      },
    },
    methods: {
      runChecks(value) {
        this.checkErrors(value);
        this.checkWarnings(value);

        const hasError = this.error.length > 0;
        this.$emit('newValue', {value: value, error: hasError});
      },
      checkWarnings(newValue) {
        this.warning = '';

        this.warnings.find(
          check => {
            let value = typeof newValue === "number" ? newValue : 0;
            if (!check.require(value)) {
              this.warning = check.message;
              return true;
            }
            return false;
          }
        )
      },
      checkErrors(newValue) {
        this.error = '';

        [...this.validators, ...this.defaultValidators].find(
          check => {
            let value = typeof newValue === "number" ? newValue : 0;
            if (!check.require(value)) {
              this.error = check.message;
              return true;
            }
            return false;
          }
        )
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.input-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: inset 3px 3px 8px rgba(191, 188, 255, 0.5);
  background-image: linear-gradient(114deg, rgba(115, 117, 252, 0.08) 39%, rgba(255, 162, 67, 0.08) 62%, rgba(245, 33, 127, 0.08) 81%);
  height: 68px;
  border-radius: 15px;
  padding-left: 10px;
  padding-right: 10px;
  border: none;
  width: 100%;

  @media screen and (min-width: $md) {
    padding-left: 30px;
    padding-right: 20px;
  }
}

input {
  background: transparent;
  border: none;
  font-family: Montserrat;
  font-weight: 600;
  font-size: 24px;
  padding-top: 0;
  padding-bottom: 0;
  max-width: 40%;

  @media screen and (min-width: $md) {
    padding-right: 5px;
    max-width: none;
  }
}

input:focus{
  outline: none;
}

// hiding arrows
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}

.converted {
  color: #696969;
  margin-right: 15px;
  white-space: nowrap;
  text-align: right;
  width: 140px;
  font-size: $font-size-sm;
  opacity: 0.6;
}

.symbol {
  margin-left: 10px;
  font-family: 'Lato';
  font-weight: 900;
  font-size: 18px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
}

.max-wrapper {
  cursor: pointer;
  width: 35px;
  min-width: 35px;
  margin-right: 20px;


  .max {
    border: solid 1px #8986fe;
    border-radius: 10px;
    width: 45px;
    height: 26px;
    font-weight: bold;
    line-height: 24px;
    color: #8986fe;
    text-align: center;
    background-color: rgba(255, 255, 255, 0.4);
  }
}

img {
  height: 24px;
  width: 24px;

  @media screen and (min-width: $md) {
    height: 36px;
    width: 36px;
  }
}

.error, .info, .warning {
  min-height: 30px;
  padding-top: 6px;
  color: #7d7d7d;
  font-size: 14px;
  width: 100%;
  text-align: end;
}

.warning {
  color: #FFD166;
}

.error, .warning {
  img {
    width: 20px;
    height: 20px;
    transform: translateY(-1px);
  }
}
.error {
  color: $red;
}
</style>
