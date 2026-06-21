<script setup lang="ts">
export type LinkedAccount = {
  accountType: 'external' | 'wlth'
  financialInstitution: string
  branch: string
  accountName: string
  bsb: string
  accountNumber: string
}

const count = defineModel<number>('count', { required: true })
const accounts = defineModel<LinkedAccount[]>('accounts', { required: true })

withDefaults(
  defineProps<{ question?: string }>(),
  { question: 'How many accounts would you like to link?' },
)

function blank(): LinkedAccount {
  return {
    accountType: 'external',
    financialInstitution: '',
    branch: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
  }
}

// Per-account expand/collapse state.
const expanded = ref<boolean[]>([true])

watch(count, (n) => {
  const cur = accounts.value
  accounts.value =
    n > cur.length
      ? [...cur, ...Array.from({ length: n - cur.length }, blank)]
      : cur.slice(0, n)
  // keep an expanded flag per account (new ones start open)
  const ex = expanded.value
  expanded.value =
    n > ex.length
      ? [...ex, ...Array.from({ length: n - ex.length }, () => true)]
      : ex.slice(0, n)
})

function isComplete(a: LinkedAccount) {
  return (
    !!a.financialInstitution &&
    !!a.accountName &&
    /^\d{3}-?\d{3}$/.test(a.bsb) &&
    /^\d{5,10}$/.test(a.accountNumber)
  )
}

function toggle(i: number) {
  expanded.value[i] = !expanded.value[i]
}

// Smart formatting: BSB as XXX-XXX, account number digits only.
function onBsb(a: LinkedAccount, e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
  a.bsb = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits
}
function onAccountNumber(a: LinkedAccount, e: Event) {
  a.accountNumber = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10)
}
</script>

<template>
  <section class="card">
    <h2>{{ question }}</h2>
    <div class="tiles">
      <button
        v-for="n in 4"
        :key="n"
        type="button"
        class="tile tile--wide"
        :class="{ 'is-selected': count === n }"
        @click="count = n"
      >
        {{ n }} {{ n === 1 ? 'Account' : 'Accounts' }}
      </button>
    </div>

    <div v-for="(a, i) in accounts" :key="i" class="acct">
      <div class="acct__head">
        <h3>Linked Account {{ i + 1 }}</h3>
        <span v-if="isComplete(a)" class="acct__ready">✓ Ready</span>
        <button type="button" class="acct__toggle" @click="toggle(i)">
          {{ expanded[i] ? 'Collapse' : 'Edit' }}
        </button>
      </div>

      <div v-if="!expanded[i] && isComplete(a)" class="acct__summary">
        {{ a.financialInstitution }} · BSB {{ a.bsb }} · Account ending
        {{ a.accountNumber.slice(-4) }}
      </div>

      <div v-show="expanded[i]">
        <div class="acct__type">
          <span class="acct__type-label">Account type</span>
          <label class="radio" :class="{ 'is-selected': a.accountType === 'external' }">
            <input v-model="a.accountType" type="radio" value="external" />
            <span>External bank account</span>
          </label>
          <label class="radio" :class="{ 'is-selected': a.accountType === 'wlth' }">
            <input v-model="a.accountType" type="radio" value="wlth" />
            <span>WLTH loan or offset account</span>
          </label>
        </div>

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
    </div>

    <slot />
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
.acct__type {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.acct__type-label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--navy);
  margin-right: 4px;
}
.acct__type .radio {
  min-height: 48px;
  flex: 0 0 auto;
}
</style>
