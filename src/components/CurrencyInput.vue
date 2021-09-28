<template>
  <div class="currency-input-wrapper" :style="{ 'flex-direction': flexDirection}">
    <div class="input-wrapper" :style="{ 'margin-top': flexDirection == 'column-reverse' ? '40px' : '0'}">
      <input type="number" v-model="value" step='0.01' placeholder="0" min="0" max="999999">
      <div class="converted" v-if="value && (value !== 0)">
        ~ {{ (price ? price : 1) * toUSD(value) | usd}}
      </div>
      <div class="logo-wrapper">
        <img :src="`https://cdn.redstone.finance/symbols/${symbol.toLowerCase()}.svg`"/>
        <span class="symbol">{{ symbol }}</span>
      </div>
    </div>
    <button class="btn" :class="[waiting ? 'waiting' : '', color]" @click="emitValue(true)"
      :style="{ 'margin-top': flexDirection == 'column' ? '40px' : '0'}">
      <div v-if="!waiting">
        {{label}}
      </div>
      <vue-loaders-ball-beat v-else color="#FFFFFF" scale="0.5"></vue-loaders-ball-beat>
    </button>
    <button v-if="hasSecondButton" class="btn" :class="[waiting ? 'waiting' : '', color]" @click="emitValue(false)"
      :style="{ 'margin-top': flexDirection == 'column' ? '40px' : '0'}">
      <div v-if="!waiting">
        {{secondLabel}}
      </div>
      <vue-loaders-ball-beat v-else color="#FFFFFF" scale="0.5"></vue-loaders-ball-beat>
    </button>
  </div>
</template>


<script>
  export default {
    name: 'CurrencyInput',
    props: {
      label: { type: String, default: '' },
      price: { type: Number },
      symbol: { type: String, default: 'AVAX' },
      hasSecondButton: { type: Boolean, default: false },
      secondLabel: { type: String, default: '' },
      color: { type: String, default: 'purple' },
      flexDirection: { type: String, default: 'column'},
      waiting: { type: Boolean, default: false },
    },
    data() {
      return {
        value: null
      }
    },
    methods: {
      emitValue(isFirstButton) {
        if (!this.waiting) {
          if (!this.hasSecondButton) {
            this.$emit('submitValue', this.value);
          } else {
            this.$emit('submitValue', { value: this.value, first: isFirstButton });
          }
          this.value = null;
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.currency-input-wrapper {
  display: flex;
  align-items: center;
}

.input-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: inset 3px 3px 8px rgba(191, 188, 255, 0.5);
  background-image: linear-gradient(114deg, rgba(115, 117, 252, 0.08) 39%, rgba(255, 162, 67, 0.08) 62%, rgba(245, 33, 127, 0.08) 81%);
  height: 68px;
  border-radius: 15px;
  padding-left: 10px;
  padding-right: 5px;
  border: none;
  width: 100%;

  @media screen and (min-width: $md) {
    padding-left: 40px;
    padding-right: 30px;
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

.waiting.btn {
    opacity: 0.5;
    cursor: initial;
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

img {
  height: 36px;
  width: 36px;
}
</style>
