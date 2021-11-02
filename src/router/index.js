import Vue from 'vue'
import Router from 'vue-router'
import Pool from '@/pages/Pool'
import Loan from '@/pages/Loan'


Vue.use(Router)


export default new Router({
  routes: [
    {
      path: '/pool',
      name: 'Pool',
      component: Pool
    },
    {
      path: '/loan',
      name: 'Loan',
      component: Loan
    },
    {
      path: '*',
      redirect: { name: 'Pool' }
    },
  ]
})
