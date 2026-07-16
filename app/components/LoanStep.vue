<script setup lang="ts">
export type Loan = { accountNumber: string; comments: string; smsfTrustName?: string }

const loan = defineModel<Loan>('loan', { required: true })
withDefaults(
  defineProps<{
    title?: string
    showSmsf?: boolean
    showErrors?: boolean
    /** Hide the Comments field (e.g. when it's rendered in a later step). */
    hideComments?: boolean
    /** Note shown under the SMSF field once a trust name is entered. */
    smsfNote?: string
  }>(),
  {
    title: 'Loan Details',
    showSmsf: false,
    showErrors: false,
    hideComments: false,
    smsfNote: '',
  },
)
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
    <p v-if="showSmsf && smsfNote && loan.smsfTrustName?.trim()" class="smsf-note">
      {{ smsfNote }}
    </p>
    <label v-if="!hideComments" class="field" style="margin-top: 18px">
      <span>Comments <em>(optional)</em></span>
      <textarea v-model="loan.comments" rows="4" placeholder="Anything else we should know?" />
    </label>
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
.smsf-note {
  margin: 10px 0 0;
  padding: 14px 16px;
  background: #fff8e7;
  border: 1px solid #fde68a;
  border-left: 5px solid #f59e0b;
  border-radius: 12px;
  color: #92400e;
  font-size: 0.9rem;
  line-height: 1.55;
}
</style>
