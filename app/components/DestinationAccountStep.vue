<script setup lang="ts">
export type DestinationAccount = {
  accountName: string
  bsb: string
  accountNumber: string
}

const account = defineModel<DestinationAccount>({ required: true })

withDefaults(defineProps<{ showErrors?: boolean }>(), { showErrors: false })

function onBsb(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
  account.value.bsb = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits
}
function onAccountNumber(e: Event) {
  account.value.accountNumber = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10)
}

const complete = computed(
  () =>
    !!account.value.accountName &&
    /^\d{3}-?\d{3}$/.test(account.value.bsb) &&
    /^\d{5,10}$/.test(account.value.accountNumber),
)
const masked = computed(() => `XXXX${account.value.accountNumber.slice(-4)}`)
</script>

<template>
  <section class="card">
    <h2>Where would you like the funds sent?</h2>
    <div class="grid2">
      <label class="field field--full">
        <span>Account Name <span class="req">*</span></span>
        <input
          v-model="account.accountName"
          type="text"
          autocomplete="name"
          placeholder="e.g. John Smith"
          :class="{ invalid: showErrors && !account.accountName.trim() }"
        />
        <span v-if="showErrors && !account.accountName.trim()" class="field__err">
          Account name is required.
        </span>
      </label>
      <label class="field">
        <span>BSB <span class="req">*</span></span>
        <input
          :value="account.bsb"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 062-000"
          maxlength="7"
          :class="{ invalid: showErrors && !/^\d{3}-?\d{3}$/.test(account.bsb) }"
          @input="onBsb"
        />
        <span v-if="showErrors && !/^\d{3}-?\d{3}$/.test(account.bsb)" class="field__err">
          Enter a 6-digit BSB.
        </span>
      </label>
      <label class="field">
        <span>Account Number <span class="req">*</span></span>
        <input
          :value="account.accountNumber"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 12345678"
          :class="{ invalid: showErrors && !/^\d{5,10}$/.test(account.accountNumber) }"
          @input="onAccountNumber"
        />
        <span v-if="showErrors && !/^\d{5,10}$/.test(account.accountNumber)" class="field__err">
          Enter a valid account number (5–10 digits).
        </span>
      </label>
    </div>

    <div v-if="complete" class="preview">
      <h4>Funds will be transferred to</h4>
      <p>
        <strong>{{ account.accountName }}</strong><br />
        {{ account.bsb }} · {{ masked }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
.preview {
  margin-top: 24px;
  border: 1.5px solid var(--line);
  border-left: 5px solid var(--aqua);
  border-radius: 14px;
  padding: 18px 24px;
  background: var(--surface-muted);
  max-width: 420px;
}
.preview h4 {
  margin: 0 0 8px;
  color: var(--navy);
  font-size: 0.95rem;
}
.preview p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}
.preview strong {
  color: var(--navy);
}
</style>
