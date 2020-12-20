// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import VueMaterial from 'vue-material'
import Vue2Filters from 'vue2-filters'
import Toasted from 'vue-toasted';
import AsyncComputed from 'vue-async-computed'
import {getSynthRate} from "./blockchain/pool"
import VueTimeline from "@growthbunker/vuetimeline";

const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();

Vue.use(require('vue-countup'));
Vue.use(Vue2Filters)
Vue.config.productionTip = false
Vue.use(VueMaterial)
Vue.use(Toasted)
Vue.use(AsyncComputed)
Vue.use(VueTimeline);


window.addEventListener('load', function () {
  /* eslint-disable no-new */
  new Vue({
    el: '#app',
    router,
    template: '<App/>',
    components: { App}
  })
})

async function getAvaxPrice() {
  let response = await CoinGeckoClient.simple.price({
    ids: 'avalanche-2',
    vs_currencies: "usd"
  });
  return response.data['avalanche-2'].usd;
}

async function setupFilters() {
  let avaxPrice = await getAvaxPrice();
  console.log("Current avax price: " + avaxPrice);

  Vue.filter('usd', function (value) {
    if (!value) return '$0';
    let usd = value*avaxPrice;
    return "$" + usd.toFixed(2);
  });

  Vue.filter('usd-precise', function (value) {
    if (!value) return '$0'
    return "$" + value.toFixed(12);
  });

  Vue.filter('avax', function (value) {
    if (!value) return '0'
    return value.toFixed(2) + ' AVAX';
  });

  Vue.filter('full', function (value) {
    if (!value) return '';
    let usd = value*avaxPrice;
    return value.toFixed(2) + ' AVAX ($' + usd.toFixed(2) +')';
  });

  Vue.filter('units', function (value) {
    if (!value) return '0';
    return value.toFixed(3);
  });

  Vue.filter('percent', function (value) {
    if (!value) return '0%';
    return (value*100).toFixed(2) + "%";
  });

  Vue.filter('tx', function (value) {
    if (!value) return '';
    return value.substr(0,6) + "..." + value.substr(value.length - 4);
  })

};

setupFilters();

