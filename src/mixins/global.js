import { mapState } from 'vuex';
import Vue from "vue";

export default {
  methods: {
    avaxToUSD(avax) {
      if (this.avaxPrice) {
        return avax * this.avaxPrice;
      }
    },
    toHex(dec) {
      return '0x' + dec.toString(16);
    },
    toDec(hex) {
      return parseInt(hex, 16);
    },
    async handleTransaction(fun, args, nameOfWaitingVariable) {
      this[nameOfWaitingVariable] = true;

      try {
        await fun(args);
        Vue.$toast.success('Transaction success');
      } catch(error) {
        Vue.$toast.error(error.message ? error.message : error);
      } finally {
        this[nameOfWaitingVariable] = false;
      }
    }
  },
  computed: {
    ...mapState('prices', ['avaxPrice']),
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  }
};
