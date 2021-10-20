<template>
  <div class="currency-form-wrapper"
       :style="{
        'flex-direction': flexDirection
      }">
    <CurrencyInput
      :price="price"
      :symbol="symbol"
      :color="color"
      :validators="validators"
      :info="info"
      v-on:newValue="updateValue"
    />
    <button class="btn" :class="[disabled ? 'disabled': '', waiting ? 'waiting': '', color]" @click="emitValue(true)"
      :style="{ 'margin-top': flexDirection === 'column' ? '15px' : '0'}">
      <div class="btn-label">
        {{label}}
      </div>
      <vue-loaders-ball-beat color="#FFFFFF" scale="0.5"></vue-loaders-ball-beat>
    </button>
  </div>
</template>


<script>
  import CurrencyInput from "./CurrencyInput";

  export default {
    name: 'CurrencyForm',
    props: {
      label: { type: String, default: '' },
      price: { type: Number },
      symbol: { type: String, default: 'AVAX' },
      color: { type: String, default: 'purple' },
      flexDirection: { type: String, default: 'column'},
      waiting: { type: Boolean, default: false },
      validators: {
        type: Array, default: () => []
      },
      info: { type: Function, default: null }
    },
    components: {
      CurrencyInput
    },
    data() {
      return {
        value: { type: Number, default: null },
        error: { type: Boolean, default: false }
      }
    },
    computed: {
      disabled() {
        return this.waiting || this.error;
      }
    },
    methods: {
      updateValue(result) {
        this.value = result.value;
        this.error = result.error;
      },
      emitValue() {
        if (!this.disabled) {
          this.$emit('submitValue', this.value);
          this.value = null;
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.currency-form-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
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
    }

    .ball-beat {
      display: block;
      margin-top: 7px;
      margin-bottom: 8px;
    }
  }
}
</style>
