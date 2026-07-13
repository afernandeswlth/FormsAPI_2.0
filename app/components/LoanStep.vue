<script setup lang="ts">
export type Loan = { accountNumber: string; comments: string; smsfTrustName?: string }

const loan = defineModel<Loan>('loan', { required: true })
withDefaults(defineProps<{ title?: string; showSmsf?: boolean; showErrors?: boolean }>(), {
  title: 'Loan Details',
  showSmsf: false,
  showErrors: false,
})
</script>

<template>
  <section class="card">
    <h2>{{ title }}</h2>
    <label class="field">
      <span>Loan Account Number <span class="req">*</span></span>
      <input
        v-model="loan.accountNumber"
        type="text"
        inputmode="numeric"
        placeholder="e.g. 400123456"
        :class="{ invalid: showErrors && !loan.accountNumber.trim() }"
      />
      <span v-if="showErrors && !loan.accountNumber.trim()" class="field__err">
        Loan account number is required.
      </span>
    </label>
    <label v-if="showSmsf" class="field" style="margin-top: 18px">
      <span>SMSF Trust Name <em>(optional)</em></span>
      <input v-model="loan.smsfTrustName" type="text" placeholder="e.g. Smith Family Super Fund" />
    </label>
    <label class="field" style="margin-top: 18px">
      <span>Comments <em>(optional)</em></span>
      <textarea v-model="loan.comments" rows="4" placeholder="Anything else we should know?" />
    </label>
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
</style>
