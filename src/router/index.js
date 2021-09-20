import Vue from 'vue'
import Router from 'vue-router'
import Deposit from '@/pages/Deposit'
import Invest from '@/pages/Invest'


Vue.use(Router)


export default new Router({
  routes: [
    {
      path: '/deposit',
      name: 'Deposit',
      component: Deposit
    },
    {
      path: '/invest',
      name: 'Invest',
      component: Invest
    },
    {
      path: '*',
      redirect: { name: 'Deposit' }
    },
  ]
})
