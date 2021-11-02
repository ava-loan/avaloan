<template>
  <div class="info-bubble-wrapper">
    <div class="info-bubble">
      <img src="src/assets/icons/info.svg"/>
      <div v-html="text">
      </div>
    </div>
  </div>
</template>


<script>
  export default {
    name: 'InfoBubble',
    props: {
      text: ''
    }
  }
</script>

<style lang="scss" scoped>
@import "~@/styles/variables";

.info-bubble-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 30px;

  .info-bubble {
    background-image: url("../assets/icons/bubble.svg");
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 23px 50px 45px 50px;
    font-weight: 500;
    color: #7d7d7d;
    line-height: 24px;
    min-width: 550px;

    img {
      margin-right: 20px;
    }
  }
}

</style>

