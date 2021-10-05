// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Vue2Filters from 'vue2-filters'
import AsyncComputed from 'vue-async-computed'
import store from './store';
import globalMixin from './mixins/global';
import setupFilters from './utils/filters';
import 'vue-loaders/dist/vue-loaders.css';
import VueLoadersBallBeat from 'vue-loaders/dist/loaders/ball-beat';
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import "./styles/overrides.scss";

Vue.config.productionTip = false;

Vue.use(Vue2Filters);
Vue.use(AsyncComputed);
Vue.use(VueLoadersBallBeat);
Vue.use(Toast);

Vue.mixin(globalMixin);

setupFilters();

/* eslint-disable no-new */
new Vue({
  el: '#app',
  store,
  router,
  template: '<App/>',
  components: {App}
})
