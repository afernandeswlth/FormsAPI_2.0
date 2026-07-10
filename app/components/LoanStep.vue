<script setup lang="ts">
export type Loan = { accountNumber: string; comments: string; smsfTrustName?: string }

const loan = defineModel<Loan>('loan', { required: true })
withDefaults(defineProps<{ title?: string; showSmsf?: boolean }>(), {
  title: 'Loan Details',
  showSmsf: false,
})
</script>

<template>
  <section class="card">
    <h2>{{ title }}</h2>
    <label class="field">
      <span>Loan Account Number <span class="req">*</span></span>
      <input v-model="loan.accountNumber" type="text" inputmode="numeric" />
    </label>
    <label v-if="showSmsf" class="field" style="margin-top: 18px">
      <span>SMSF Trust Name <em>(optional)</em></span>
      <input v-model="loan.smsfTrustName" type="text" />
    </label>
    <label class="field" style="margin-top: 18px">
      <span>Comments <em>(optional)</em></span>
      <textarea v-model="loan.comments" rows="4" />
    </label>
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
</style>
