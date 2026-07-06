<script setup lang="ts">
const amount = defineModel<number | null>('amount', { required: true })
const reason = defineModel<string>('reason', { required: true })
const acknowledged = defineModel<boolean>('acknowledged', { required: true })

const MAX_REASON = 1000

const formattedAmount = computed(() =>
  typeof amount.value === 'number' && amount.value > 0
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount.value)
    : '',
)

function onReason(e: Event) {
  reason.value = (e.target as HTMLTextAreaElement).value.slice(0, MAX_REASON)
}
</script>

<template>
  <div class="stack">
    <!-- Amount -->
    <section class="card">
      <h2>Principal Reduction Amount</h2>
      <p class="muted">
        How much would you like to apply as a permanent principal reduction?
      </p>
      <div class="amount">
        <span class="amount__sign">$</span>
        <input
          v-model.number="amount"
          class="amount__input"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          placeholder="10,000.00"
        />
      </div>

      <div class="info">
        <span class="info__icon">💡</span>
        <div>
          <strong>Important Information</strong>
          <p>
            Please specify the exact amount you wish to use as a permanent
            principal reduction. These funds must already be available in your
            loan redraw balance or linked offset account at the time your request
            is processed.
          </p>
        </div>
      </div>

      <div v-if="formattedAmount" class="summary">
        <h4>Permanent Principal Reduction</h4>
        <div class="summary__row">
          <span>Reduction Amount</span><strong>{{ formattedAmount }}</strong>
        </div>
      </div>
    </section>

    <!-- Reason -->
    <section class="card">
      <h2>Reason For Request</h2>
      <label class="field">
        <span>Please tell us why you would like to make this principal reduction. <span class="req">*</span></span>
        <textarea
          :value="reason"
          class="reason"
          :maxlength="MAX_REASON"
          placeholder="Request to apply funds in available redraw (advanced position), in the amount of $25,000 as a permanent principal reduction to the loan."
          @input="onReason"
        />
      </label>
      <p class="counter">{{ reason.length }} / {{ MAX_REASON }} characters</p>
    </section>

    <!-- Acknowledgement -->
    <section class="ack">
      <h3>Acknowledgement</h3>
      <ul>
        <li>
          I understand that a permanent principal reduction cannot be reversed
          once processed.
        </li>
        <li>
          I acknowledge that applying funds to reduce the principal balance may
          reduce the available redraw amount on my loan.
        </li>
        <li>
          I confirm that sufficient funds are available in my loan redraw balance
          or linked offset account to complete this request.
        </li>
      </ul>
      <label class="check">
        <input v-model="acknowledged" type="checkbox" />
        <span>I understand and accept the above acknowledgement.</span>
      </label>
    </section>
  </div>
</template>

<style scoped>
.req {
  color: #d92d20;
}
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
.info {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-top: 22px;
  background: var(--surface-muted);
  border-left: 5px solid var(--aqua);
  border-radius: 12px;
  padding: 20px;
}
.info__icon {
  font-size: 1.4rem;
  line-height: 1;
}
.info strong {
  display: block;
  color: var(--navy);
  margin-bottom: 6px;
}
.info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 0.92rem;
}
.summary {
  margin-top: 22px;
  border: 1.5px solid var(--line);
  border-left: 5px solid var(--aqua);
  border-radius: 14px;
  padding: 18px 24px;
  background: var(--surface-muted);
  max-width: 420px;
}
.summary h4 {
  margin: 0 0 12px;
  color: var(--navy);
  font-size: 1rem;
}
.summary__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--muted);
}
.summary__row strong {
  color: var(--navy);
  font-size: 1.4rem;
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
  width: 100%;
}
.reason:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.counter {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--muted);
  text-align: right;
}
.ack {
  background: #fff8e7;
  border-left: 5px solid #f59e0b;
  border-radius: 12px;
  padding: 24px 28px;
}
.ack h3 {
  margin: 0 0 12px;
  color: var(--navy);
}
.ack ul {
  margin: 0 0 16px;
  padding-left: 20px;
  color: #92400e;
  line-height: 1.6;
  font-size: 0.92rem;
}
.ack li {
  margin-bottom: 8px;
}
.check {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: var(--navy);
  cursor: pointer;
  min-height: 44px;
}
.check input {
  width: 22px;
  height: 22px;
  accent-color: var(--blue);
}
</style>
