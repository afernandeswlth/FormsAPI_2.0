<script setup lang="ts">
export type ProductType = '' | 'pi' | 'io' | 'fixed'

const productType = defineModel<ProductType>('productType', { required: true })
const interestRate = defineModel<number | null>('interestRate', { required: true })
const term = defineModel<string>('term', { required: true })
const reason = defineModel<string>('reason', { required: true })
withDefaults(defineProps<{ showErrors?: boolean }>(), { showErrors: false })

const products = [
  {
    value: 'pi',
    icon: '📈',
    label: 'Principal & Interest',
    desc: 'Repayments include both principal and interest, helping reduce your loan balance over time.',
  },
  {
    value: 'io',
    icon: '⏳',
    label: 'Interest Only',
    desc: 'Repayments will only cover interest for the selected period.',
  },
  {
    value: 'fixed',
    icon: '🔒',
    label: 'Fixed Rate',
    desc: 'Lock in a fixed interest rate for a selected period.',
  },
] as const

const TERM_OPTIONS = [
  '12 Months',
  '24 Months',
  '36 Months',
  '1 Year',
  '2 Years',
  '3 Years',
  '5 Years',
]

const selected = computed(() => products.find((p) => p.value === productType.value))
const needsTerm = computed(() => productType.value === 'io' || productType.value === 'fixed')
const termQuestion = computed(() =>
  productType.value === 'io'
    ? 'How long would you like the Interest Only period to be?'
    : 'How long would you like the fixed period to be?',
)

// Clear term when switching to a product that doesn't need one.
watch(productType, () => {
  if (!needsTerm.value) term.value = ''
})
</script>

<template>
  <div class="stack">
    <section class="card">
      <h2>What product would you like to switch to?</h2>

      <div class="products">
        <button
          v-for="p in products"
          :key="p.value"
          type="button"
          class="product"
          :class="{ 'is-selected': productType === p.value }"
          @click="productType = p.value"
        >
          <span class="product__icon">{{ p.icon }}</span>
          <span class="product__label">{{ p.label }}</span>
        </button>
      </div>
      <span v-if="showErrors && !productType" class="field__err">
        Select the product you would like to switch to.
      </span>

      <template v-if="selected">
        <div class="info">
          <span class="info__icon">{{ selected.icon }}</span>
          <div>
            <h3>{{ selected.label }}</h3>
            <p>{{ selected.desc }}</p>
          </div>
        </div>

        <label class="field" style="margin-top: 22px; max-width: 320px">
          <span>Preferred Interest Rate <em>(optional)</em></span>
          <div class="rate">
            <input
              v-model.number="interestRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputmode="decimal"
              placeholder="e.g. 5.99"
            />
            <span class="rate__suffix">%</span>
          </div>
        </label>

        <template v-if="needsTerm">
          <h3>{{ termQuestion }}</h3>
          <label class="field" style="max-width: 320px">
            <span>Period <span class="req">*</span></span>
            <select v-model="term" class="select" :class="{ invalid: showErrors && !term }">
              <option value="" disabled>Select a period</option>
              <option v-for="t in TERM_OPTIONS" :key="t" :value="t">{{ t }}</option>
            </select>
            <span v-if="showErrors && !term" class="field__err">Select a period.</span>
          </label>
        </template>
      </template>

      <div class="notice-warn">
        <span class="notice-warn__icon">⚠️</span>
        <div>
          <strong>Important Information</strong>
          <p>
            Fees will be applicable and break costs may also be applicable for
            fixed interest rate loans. Further clarification regarding these costs
            should be obtained from your WLTH customer service representative.
          </p>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Reason For Product Switch</h2>
      <label class="field">
        <span>Please tell us why you would like to switch products. <span class="req">*</span></span>
        <textarea
          v-model="reason"
          class="reason"
          :class="{ invalid: showErrors && !reason.trim() }"
          placeholder="Example: I would like greater repayment certainty and would prefer a fixed rate product for the next 3 years."
        />
        <span v-if="showErrors && !reason.trim()" class="field__err">
          Please tell us why you would like to switch products.
        </span>
      </label>
    </section>
  </div>
</template>

<style scoped>
.req {
  color: #d92d20;
}
.products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.product {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 22px 20px;
  border: 2px solid var(--line);
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: all 0.15s ease;
  min-height: 110px;
}
.product:hover {
  border-color: var(--blue);
}
.product.is-selected {
  background: var(--blue);
  border: 2px solid var(--aqua);
  color: #fff;
}
.product__icon {
  font-size: 1.8rem;
  line-height: 1;
}
.product__label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--navy);
}
.product.is-selected .product__label {
  color: #fff;
}
.info {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-top: 22px;
  padding: 18px 20px;
  background: var(--surface-muted);
  border: 1.5px solid var(--line);
  border-left: 5px solid var(--aqua);
  border-radius: 12px;
}
.info__icon {
  font-size: 1.6rem;
  line-height: 1;
}
.info h3 {
  margin: 0 0 6px;
  color: var(--navy);
}
.info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}
.rate {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}
.rate:focus-within {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.rate input {
  flex: 1;
  border: none;
  outline: none;
  min-height: 52px;
  padding: 0 0 0 14px;
  font: inherit;
  color: var(--ink);
}
.rate__suffix {
  padding: 0 16px;
  color: var(--muted);
  font-weight: 600;
}
.select {
  min-height: 52px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  color: var(--ink);
  background: #fff;
}
.select:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.select.invalid {
  border-color: var(--error);
}
.reason {
  min-height: 180px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  font: inherit;
  font-weight: 400;
  color: var(--ink);
  resize: vertical;
}
.reason.invalid {
  border-color: var(--error);
}
.reason:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.notice-warn {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-top: 24px;
  background: #fff8e7;
  border-left: 5px solid #f59e0b;
  border-radius: 12px;
  padding: 20px;
}
.notice-warn__icon {
  font-size: 1.4rem;
  line-height: 1;
}
.notice-warn strong {
  display: block;
  color: var(--navy);
  margin-bottom: 6px;
}
.notice-warn p {
  margin: 0;
  color: #92400e;
  line-height: 1.55;
  font-size: 0.92rem;
}
</style>
