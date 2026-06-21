<script setup lang="ts">
const amount = defineModel<number | null>('amount', { required: true })

const EVIDENCE_THRESHOLD = 100000
const overThreshold = computed(() => Number(amount.value) > EVIDENCE_THRESHOLD)
const hasAmount = computed(() => Number(amount.value) > 0)
</script>

<template>
  <section class="card">
    <h2>How much would you like to redraw?</h2>

    <div class="amount">
      <span class="amount__sign">$</span>
      <input
        v-model.number="amount"
        class="amount__input"
        type="number"
        min="0"
        step="0.01"
        inputmode="decimal"
        placeholder="0.00"
      />
    </div>

    <p v-if="hasAmount" class="notice" :class="{ 'notice--warn': overThreshold }">
      {{
        overThreshold
          ? 'Supporting documentation will be required before submission.'
          : 'No supporting evidence is required at this stage.'
      }}
    </p>
  </section>
</template>

<style scoped>
.amount {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  max-width: 380px;
}
.amount:focus-within {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.amount__sign {
  padding: 0 18px;
  font-size: 32px;
  font-weight: 600;
  color: var(--muted);
}
.amount__input {
  flex: 1;
  border: none;
  outline: none;
  height: 70px;
  font-size: 32px;
  font-weight: 600;
  color: var(--ink);
  padding: 0 16px 0 0;
  font-family: inherit;
}
.notice {
  margin-top: 22px;
  font-size: 0.9rem;
  color: var(--muted);
  background: #fbfcfe;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  line-height: 1.5;
}
.notice--warn {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}
</style>
