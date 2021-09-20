import { mapState } from 'vuex';

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
    }
  },
  computed: {
    ...mapState('prices', {
      avaxPrice: state => state.avaxPrice,
    }),
    isMobile() {
      console.log(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  }
};
