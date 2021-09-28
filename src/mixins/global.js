import { mapState } from 'vuex';
import Vue from "vue";

export default {
  data() {
    return {
    }
  },
  methods: {
    toUSD(avax) {
      if (this.avaxPrice) {
        return avax * this.avaxPrice;
      }
    },
    notify(message) {
      alert(message);
    },
    toHex(dec) {
      return '0x' + dec.toString(16);
    },
    toDec(hex) {
      return parseInt(hex, 16);
    },
    async handleTransaction(fun, value, variable) {
      this[variable] = true;

      fun({amount: value})
        .then(() => {
          Vue.$toast.success('Transaction success');
        })
        .catch(() => {
          Vue.$toast.error('Transaction error');
        })
        .finally(() => {
          this[variable] = false;
        });
    }
  },
  computed: {
    ...mapState('prices', {
      avaxPrice: state => state.avaxPrice,
    }),
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  }
};
