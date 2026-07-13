<script setup lang="ts">
const frequency = defineModel<'' | 'weekly' | 'fortnightly' | 'monthly'>('frequency', {
  required: true,
})
const amountType = defineModel<'' | 'minimum' | 'fixed'>('amountType', { required: true })
const amount = defineModel<number | null>('amount', { required: true })
withDefaults(defineProps<{ showErrors?: boolean }>(), { showErrors: false })

const freqOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
] as const

const formattedAmount = computed(() =>
  typeof amount.value === 'number' && amount.value > 0
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount.value)
    : '',
)
const showPreview = computed(
  () =>
    !!frequency.value &&
    (amountType.value === 'minimum' ||
      (amountType.value === 'fixed' && !!formattedAmount.value)),
)
const previewAmount = computed(() =>
  amountType.value === 'minimum' ? 'Minimum amount' : formattedAmount.value,
)
</script>

<template>
  <section class="card">
    <h2>New Repayment Arrangement</h2>

    <h3>Payment Frequency</h3>
    <div class="tiles">
      <button
        v-for="f in freqOptions"
        :key="f.value"
        type="button"
        class="tile tile--wide"
        :class="{ 'is-selected': frequency === f.value }"
        @click="frequency = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <h3>Repayment Amount</h3>
    <p class="muted">What would you like your new repayment amount to be?</p>
    <div class="radios">
      <label class="radio" :class="{ 'is-selected': amountType === 'minimum' }">
        <input v-model="amountType" type="radio" value="minimum" />
        <span>Minimum amount</span>
      </label>
      <label class="radio" :class="{ 'is-selected': amountType === 'fixed' }">
        <input v-model="amountType" type="radio" value="fixed" />
        <span>Fixed amount</span>
      </label>
    </div>

    <div
      v-if="amountType === 'fixed'"
      class="amount"
      :class="{ 'amount--invalid': showErrors && !(Number(amount) > 0) }"
    >
      <span class="amount__sign">$</span>
      <input
        v-model.number="amount"
        class="amount__input"
        type="number"
        min="0"
        step="0.01"
        inputmode="decimal"
        placeholder="e.g. 2500.00"
      />
    </div>
    <span v-if="amountType === 'fixed' && showErrors && !(Number(amount) > 0)" class="field__err">
      Enter your fixed repayment amount.
    </span>

    <div v-if="showPreview" class="preview">
      <h4>New Repayment Schedule</h4>
      <div class="preview__row">
        <span>Frequency</span><strong class="cap">{{ frequency }}</strong>
      </div>
      <div class="preview__row">
        <span>Repayment</span><strong>{{ previewAmount }}</strong>
      </div>
    </div>

    <p class="notice">
      Please note that fees may apply in accordance with your loan contract and
      submission of this request does not guarantee approval.
    </p>
  </section>
</template>

<style scoped>
.amount {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  max-width: 320px;
  margin-top: 16px;
}
.amount:focus-within {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.amount--invalid {
  border-color: var(--error);
}
.amount__sign {
  padding: 0 16px;
  font-size: 24px;
  font-weight: 600;
  color: var(--muted);
}
.amount__input {
  flex: 1;
  border: none;
  outline: none;
  height: 60px;
  font-size: 24px;
  font-weight: 600;
  color: var(--ink);
  padding: 0 14px 0 0;
  font-family: inherit;
}
.preview {
  margin-top: 24px;
  border: 1.5px solid var(--line);
  border-left: 5px solid var(--aqua);
  border-radius: 14px;
  padding: 20px 24px;
  background: var(--surface-muted);
  max-width: 420px;
}
.preview h4 {
  margin: 0 0 12px;
  color: var(--navy);
  font-size: 1rem;
}
.preview__row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.95rem;
  color: var(--muted);
}
.preview__row strong {
  color: var(--navy);
}
.cap {
  text-transform: capitalize;
}
.notice {
  margin-top: 24px;
  font-size: 0.85rem;
  color: var(--muted);
  background: #fbfcfe;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  line-height: 1.5;
}
</style>
