import { mapState } from 'vuex';
import Vue from "vue";

export default {
  methods: {
    toUSD(avax) {
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
    async handleTransaction(fun, args, variable) {
      this[variable] = true;

      return fun(args)
        .then(() => {
          Vue.$toast.success('Transaction success');
        })
        .catch(() => {
          Vue.$toast.error('Transaction error');
        })
        .finally(() => {
          this[variable] = false;
        });
    },
    async check(fun, message) {
      if (!fun()) {
        Vue.$toast.error(message);
      }
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
