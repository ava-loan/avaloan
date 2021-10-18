<template>
  <div class="wrapper">
    <div class="solvency-value">{{ solvency | percent }}</div>
    <div class="bar-wrapper">
      <div class="solvency-info">{{info}}</div>
      <div class="bar">
        <div class="solvency-state" :style="{'width': width}">
        </div>
        <div class="minimum-indicator"></div>
        <div class="minimum-value">120%</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  name: 'SolvencyBar',
  props: {
  },
  data() {
    return {
    }
  },
  computed: {
    ...mapState('loan', ['solvency']),
    info() {
      if (this.solvency < 1.2) {
        return "Your loan is insolvent."
      } else if (this.solvency < 1.24) {
        return "Be careful!"
      } else {
        return "You are doing great!"
      }
    },
    width() {
      if (this.solvency < 1.2) {
        return this.solvency * 40 + '%';
      } else if (this.solvency < 1.3) {
        return (48 + (this.solvency - 1.2) * 100) + '%';
      } else {
        return Math.min(58 + (this.solvency - 1.3) * 20, 80) + '%';
      }
    }
  }
}
</script>

<style lang="scss" scoped>

.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;

  .solvency-value {
    font-size: 23px;
  }

  .solvency-info {
    color: #7d7d7d;
    margin-top: 7px;
    margin-bottom: 9px;
  }
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;

  .bar {
    position: relative;
    height: 17px;
    width: 108px;
    border-radius: 9.5px;
    box-shadow: inset 0 1px 3px 0 rgba(191, 188, 255, 0.7);
    background-color: rgba(191, 188, 255, 0.2);

    .minimum-indicator {
      position: absolute;
      margin-left: 51px;
      content: " ";
      transform: translateY(-19px);
      height: 21px;
      width: 1px;
      background-color: #7d7d7d;
    }

    .minimum-value {
      margin-left: 38px;
    }

    .solvency-state {
      height: 17px;
      background-image: linear-gradient(to right, #a5a9ff 17%, #c0a6ff 91%);
      border-bottom-left-radius: 9.5px;
      border-top-left-radius: 9.5px;
    }
  }
}

.info {
  margin-top: 4px;
  text-align: center;
  color: #696969;
  font-size: 14px;
  opacity: 0.6;
}

.inner-text {
  font-size: 24px;
}
</style>
