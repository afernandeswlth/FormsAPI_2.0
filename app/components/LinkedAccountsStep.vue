<script setup lang="ts">
export type LinkedAccount = {
  linkTo: 'loan' | 'offset'
  offsetAccountNumber: string
  financialInstitution: string
  branch: string
  accountName: string
  bsb: string
  accountNumber: string
}

const accounts = defineModel<LinkedAccount[]>('accounts', { required: true })

const props = withDefaults(
  defineProps<{
    /** When true (an SMSF trust name was provided), "Loan Account" cannot be selected. */
    smsfProvided?: boolean
  }>(),
  { smsfProvided: false },
)

function blank(): LinkedAccount {
  return {
    linkTo: props.smsfProvided ? 'offset' : 'loan',
    offsetAccountNumber: '',
    financialInstitution: '',
    branch: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
  }
}

function addAccount() {
  if (accounts.value.length < 4) accounts.value = [...accounts.value, blank()]
}
function removeAccount(i: number) {
  if (accounts.value.length > 1) accounts.value = accounts.value.filter((_, idx) => idx !== i)
}

// Smart formatting: BSB as XXX-XXX, account numbers digits only.
function onBsb(a: LinkedAccount, e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
  a.bsb = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits
}
function onAccountNumber(a: LinkedAccount, e: Event) {
  a.accountNumber = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10)
}
function onOffsetNumber(a: LinkedAccount, e: Event) {
  a.offsetAccountNumber = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10)
}
</script>

<template>
  <section class="card">
    <h2>Nominated account(s) to link to your loan</h2>

    <div v-for="(a, i) in accounts" :key="i" class="acct">
      <div class="acct__head">
        <h3>Linked Account {{ i + 1 }}</h3>
        <button
          v-if="accounts.length > 1"
          type="button"
          class="acct__remove"
          @click="removeAccount(i)"
        >
          Remove
        </button>
      </div>

      <div class="linkto">
        <span class="linkto__label">Account to link to</span>
        <button
          type="button"
          class="linkto__opt"
          :class="{ 'is-selected': a.linkTo === 'loan' }"
          :disabled="smsfProvided"
          @click="a.linkTo = 'loan'"
        >
          Loan Account
        </button>
        <button
          type="button"
          class="linkto__opt"
          :class="{ 'is-selected': a.linkTo === 'offset' }"
          @click="a.linkTo = 'offset'"
        >
          Offset account
        </button>
      </div>
      <p v-if="smsfProvided" class="muted small linkto__note">
        An SMSF trust name was provided, so repayments must come from an offset account —
        Loan Account can't be selected.
      </p>

      <label v-if="a.linkTo === 'offset'" class="field field--full offset-field">
        <span>Offset Account Number <span class="req">*</span></span>
        <input
          :value="a.offsetAccountNumber"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 400001234"
          @input="onOffsetNumber(a, $event)"
        />
      </label>

      <div class="grid2">
        <label class="field">
          <span>Financial Institution <span class="req">*</span></span>
          <input v-model="a.financialInstitution" type="text" />
        </label>
        <label class="field">
          <span>Branch <em>(optional)</em></span>
          <input v-model="a.branch" type="text" />
        </label>
        <label class="field field--full">
          <span>Account Name <span class="req">*</span></span>
          <input v-model="a.accountName" type="text" />
        </label>
        <label class="field">
          <span>BSB <span class="req">*</span></span>
          <input
            :value="a.bsb"
            type="text"
            inputmode="numeric"
            placeholder="062-000"
            maxlength="7"
            @input="onBsb(a, $event)"
          />
        </label>
        <label class="field">
          <span>Account Number <span class="req">*</span></span>
          <input
            :value="a.accountNumber"
            type="text"
            inputmode="numeric"
            @input="onAccountNumber(a, $event)"
          />
        </label>
      </div>
    </div>

    <!-- Bank statement upload(s) slotted in by the parent -->
    <slot />

    <button
      type="button"
      class="add-account"
      :disabled="accounts.length >= 4"
      @click="addAccount"
    >
      + Add another linked account
    </button>
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
.acct__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.acct__remove {
  background: none;
  border: none;
  color: var(--error, #ef4444);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 0;
}
.acct__remove:hover {
  text-decoration: underline;
}
.linkto {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 6px 0 8px;
}
.linkto__label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--navy);
  margin-right: 4px;
}
.linkto__opt {
  min-height: 48px;
  padding: 0 20px;
  border: 1.5px solid var(--line);
  border-radius: var(--radius-pill);
  background: #fff;
  font: inherit;
  font-weight: 600;
  color: var(--navy);
  cursor: pointer;
}
.linkto__opt.is-selected {
  border-color: var(--blue);
  color: var(--blue);
  background: rgba(20, 69, 199, 0.04);
}
.linkto__opt:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.linkto__note {
  margin: 0 0 14px;
}
.offset-field {
  margin-bottom: 18px;
}
.add-account {
  margin-top: 22px;
  background: var(--primary-tint);
  color: var(--blue);
  border: 1.5px dashed var(--blue);
  border-radius: var(--radius-pill);
  font: inherit;
  font-weight: 600;
  padding: 12px 24px;
  min-height: 48px;
  cursor: pointer;
}
.add-account:hover:not(:disabled) {
  background: var(--rb-100, #d9e2ff);
}
.add-account:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
