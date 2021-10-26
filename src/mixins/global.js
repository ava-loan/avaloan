import { mapState } from 'vuex';
import Vue from "vue";
import { Contract } from "ethers";
import EXCHANGE from '@contracts/PangolinExchange.json'
import {parseUnits, formatUnits} from "../utils/calculate";

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
    },
    async calculateSlippageForBuy(symbol, price, tokenDecimals, tokenAddress, amount) {
      if (amount > 0) {
        const exchange = new Contract(EXCHANGE.networks[this.chainId].address, EXCHANGE.abi, provider.getSigner());

        const expectedAvax = amount * price;

        let checkedAvax =
          await exchange.getMinimumAVAXForERC20Token(
            parseUnits((amount).toString(), tokenDecimals), tokenAddress
          );

        checkedAvax = parseFloat(formatUnits(checkedAvax, 18));

        let slippage = 0;

        if (checkedAvax > expectedAvax) {
          slippage = (checkedAvax - expectedAvax) / expectedAvax;
        }

        return slippage;
      } else {
        return 0;
      }
    },
    async calculateSlippageForSell(symbol, price, tokenDecimals, tokenAddress, amount) {
      if (amount > 0) {
        const exchange = new Contract(EXCHANGE.networks[this.chainId].address, EXCHANGE.abi, provider.getSigner());

        const expectedAvax = amount * price;

        let checkedAvax =
          await exchange.getMaximumAVAXFromERC20Token(
            parseUnits((amount).toString(), tokenDecimals), tokenAddress
          );

        checkedAvax = parseFloat(formatUnits(checkedAvax, 18));

        let slippage = 0;

        if (checkedAvax < expectedAvax) {
          slippage = (expectedAvax - checkedAvax) / expectedAvax;
        }

        return slippage;
      } else {
        return 0;
      }
    }
  },
  computed: {
    ...mapState('prices', ['avaxPrice']),
    ...mapState('network', ['chainId', 'provider']),
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  }
};
