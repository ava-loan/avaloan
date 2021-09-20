<template>
  <VueSvgGauge
    class="gauge"
    :start-angle="-110"
    :end-angle="110"
    :value="solvency"
    :separator-step="0"
    :min="1200"
    :max="10000"ą
    :innerRadius="70"
    :gauge-color="[{ offset: 0, color: 'rgba(255, 0, 0, 0.6)'}, { offset: 100, color: 'rgba(0, 128, 0, 0.6)'}]"
    :scale-interval="0"
  >
    <div class="inner-text" :class="{'mobile': isMobile}">
      {{solvency | percent}}
    </div>
  </VueSvgGauge>
</template>

<script>
import { VueSvgGauge } from 'vue-svg-gauge'
import { mapState } from "vuex";

export default {
  props: {
  },
  data () {
  },
  computed: {
    ...mapState('loan', ['solvency'])
  },
  components: {
    VueSvgGauge
  }
}
</script>

<style lang="scss">
  .gauge .inner-text {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    text-align: center;
    vertical-align: middle;
    position: relative;
    margin-top: 85px;
    font-size: 34px;

    &.mobile {
      margin-top: 0;
      transform: translate(-30%, 20%);
      font-size: 14px;
    }
  }
</style>
