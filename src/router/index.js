import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/components/Home'
import Pool from '@/components/Pool'


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
    }
  ]
})
