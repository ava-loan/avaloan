import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/components/Home'
import Pool from '@/components/Pool'
import Loan from '@/components/Loan'


Vue.use(Router)


export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/pool',
      name: 'Pool',
      component: Pool
    },
    {
      path: '/loan',
      name: 'Loan',
      component: Loan
    }
  ]
})
