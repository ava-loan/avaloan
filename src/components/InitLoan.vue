<template>
  <div>
    <div>
        <CurrencyInput label="Borrow" v-on:submitValue="borrow" :waiting="processing"/>
    </div>  
  </div>
</template>


<script>
  import { mapActions, mapGetters } from 'vuex';
  import CurrencyInput from "@/components/CurrencyInput.vue";
  import Vue from "vue";

  export default {
    name: 'InitLoan',
    components: {
      CurrencyInput
    },
    data() {
      return {
        processing: false
      }
    },
    computed: {
      ...mapGetters('pool', ['getAvailable'])
    },
    methods: {
      ...mapActions('loan', ['createNewLoan']),
      borrow: async function(value) {
        if (value > this.getAvailable) {
          Vue.$toast.error("Not enough funds available in the pool!");
        } else {
          this.processing = true;
          try {
            await this.createNewLoan({amount: value});
            Vue.$toast.success("A new Smart Loan has been created!");
            this.$router.push('invest')
          } finally {
            this.processing = false;
          }
        }
      },
    }
  }
</script>

<style lang="scss" scoped>

</style>
