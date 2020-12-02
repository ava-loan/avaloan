/* eslint-disable */
<template>
  <div class="home-page">

   <div class="motto">
     My Loan is my Collateral...
   </div>

   <img class="meditation" src="/static/meditation.gif"/>

    <div style="text-align: center">
      <md-button  id="pool-button" class="md-raised md-accent rounded-button" @click="$router.push({path: '/pool'})">Deposit & Earn</md-button>
      <md-button id="trade-button" class="md-raised md-accent rounded-button" @click="$router.push({path: '/trade'})">Borrow & Trade</md-button>
    </div>

  </div>
</template>

<script>
  export default {
    name: 'Home',
    data() {
      return {
        treasure: {}
      }
    },
    methods: {

    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">

  div.home-page {
    padding: 40px 20px 0 20px;
    width: 100%;
    height: 800px;
    text-align: center;
    margin-top:-30px
  }

  img.meditation {
    height: 50%;
  }

  div.motto {
    font-family: 'Permanent Marker', cursive;
    /*font-family: 'Raleway', sans-serif;*/
    margin-top: 30px;
    margin-bottom: 15px;
    font-size: 36px;
    color: #F17843;

  }

  .rounded-button {
    border-radius: 30px;
    height: 50px;
    font-size: 16px;
    width: 200px;
    margin-right:80px;
    margin-left:80px;
  }

  .rounded-button .md-ripple {
    background-color: #8A48DB !important;
  }


</style>
