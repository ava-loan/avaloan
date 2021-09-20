<template>
  <div class='tab' v-show='isActive'>
    <slot></slot>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: 'Tab'
    },
    imgActive: String,
    img: String,
    imgPosition: String,
    titleWidth: String
  },
  data () {
    return {
      isActive: true
    }
  }
}
</script>

<style lang="css">
.tab {
  display: flex;
  justify-content: center;
}
</style>
