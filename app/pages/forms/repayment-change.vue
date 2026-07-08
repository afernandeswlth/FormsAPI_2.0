<script setup lang="ts">
import type { Borrower } from '../../components/BorrowersStep.vue'
import { englishError } from '../../utils/english'

useHead({ title: 'Repayment Change Request — WLTH Client Hub' })

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'repayment', label: 'Repayment' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
]

const step = ref(0)

// State
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([{ firstName: '', lastName: '', mobile: '', email: '' }])
const loan = ref({ accountNumber: '', comments: '' })
const frequency = ref<'' | 'weekly' | 'fortnightly' | 'monthly'>('')
const amountType = ref<'' | 'minimum' | 'fixed'>('')
const amount = ref<number | null>(null)
const agreed = ref(false)
const signatures = ref<string[]>([''])

watch(borrowerCount, (n) => {
  const cur = signatures.value
  signatures.value =
    n > cur.length ? [...cur, ...Array.from({ length: n - cur.length }, () => '')] : cur.slice(0, n)
})

const formattedAmount = computed(() =>
  typeof amount.value === 'number' && amount.value > 0
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount.value)
    : '',
)

const declarationText = `I/We understand that submission of this form does not guarantee approval of the requested repayment change.

I/We acknowledge that WLTH will assess the request and communicate the outcome.

I/We acknowledge that all other details relating to the loan remain unchanged.`

// ---- Validation ----
const errors = ref<string[]>([])
function validateStep(i: number): string[] {
  const e: string[] = []
  if (i === 0) {
    borrowers.value.forEach((b, idx) => {
      if (!b.firstName || !b.lastName) e.push(`Borrower ${idx + 1}: name is required`)
      if (b.mobile.replace(/\D/g, '').length < 6) e.push(`Borrower ${idx + 1}: valid mobile required`)
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) e.push(`Borrower ${idx + 1}: valid email required`)
    })
  } else if (i === 1) {
    if (!loan.value.accountNumber.trim()) e.push('Loan account number is required')
  } else if (i === 2) {
    if (!frequency.value) e.push('Select a payment frequency')
    if (!amountType.value) e.push('Select a repayment amount option')
    if (amountType.value === 'fixed' && !(Number(amount.value) > 0))
      e.push('Enter your fixed repayment amount')
  } else if (i === 4) {
    if (!agreed.value) e.push('You must accept the declaration')
    signatures.value.forEach((s, idx) => {
      if (!s) e.push(`Borrower ${idx + 1} must sign`)
    })
  }
  e.push(...englishError({ borrowers: borrowers.value, loan: loan.value }))
  return e
}

function next() {
  const e = validateStep(step.value)
  errors.value = e
  if (e.length) return
  step.value = Math.min(step.value + 1, STEPS.length - 1)
  scrollTop()
}
function prev() {
  errors.value = []
  step.value = Math.max(step.value - 1, 0)
  scrollTop()
}
function goTo(i: number) {
  errors.value = []
  step.value = i
  scrollTop()
}
function scrollTop() {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ---- Submit ----
const submitting = ref(false)
const result = ref<{ reference: string; id: string } | null>(null)
const submitError = ref('')

async function submit() {
  const e = validateStep(4)
  errors.value = e
  if (e.length) return
  submitting.value = true
  submitError.value = ''

  const primary = borrowers.value[0]!
  const payload = {
    customer: {
      firstName: primary.firstName,
      lastName: primary.lastName,
      email: primary.email,
      phone: primary.mobile,
    },
    loanAccountNumber: loan.value.accountNumber,
    borrowers: borrowers.value,
    frequency: frequency.value,
    amountType: amountType.value,
    amount: amountType.value === 'fixed' ? Number(amount.value) : undefined,
    declaration: { agreed: agreed.value },
    signatures: signatures.value.map((image, borrowerIndex) => ({
      borrowerIndex,
      image,
      signedAt: new Date().toISOString(),
    })),
    audit: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      capturedAt: new Date().toISOString(),
    },
  }

  try {
    const res = await $fetch<{ reference: string; id: string }>(
      '/api/requests/repayment-change',
      { method: 'POST', body: payload },
    )
    result.value = { reference: res.reference, id: res.id }
    scrollTop()
  } catch {
    submitError.value = 'Something went wrong submitting your request. Please try again.'
  } finally {
    submitting.value = false
  }
}

function downloadCopy() {
  const lines = [
    'WLTH — Repayment Change Request',
    result.value ? `Reference: ${result.value.reference}` : '',
    '',
    `Loan Account: ${loan.value.accountNumber}`,
    '',
    'Borrowers:',
    ...borrowers.value.map(
      (b, i) => `  ${i + 1}. ${b.firstName} ${b.lastName} — ${b.mobile} — ${b.email}`,
    ),
    '',
    'Requested change:',
    `  Frequency: ${frequency.value}`,
    `  Repayment amount: ${amountType.value === 'minimum' ? 'Minimum amount' : formattedAmount.value}`,
    '',
    'Signatures recorded on file for every borrower.',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.value?.reference ?? 'repayment-change'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="form-page">
    <FormHeader
      title="Repayment Change Request"
      subtitle="Request a change to your loan repayment amount and frequency."
    />
    <ProgressStepper :steps="STEPS" :current="step" @goto="goTo" />

    <main class="form-main">
      <SuccessScreen
        v-if="result"
        heading="Repayment Change Request Submitted"
        message="Thank you. Your request has been submitted to the WLTH team for review.&#10;&#10;We will contact you if any additional information is required."
        :reference="result.reference"
        :download-href="`/api/requests/repayment-change/${result.id}/pdf`"
      />

      <template v-else>
        <BorrowersStep
          v-if="step === 0"
          v-model:count="borrowerCount"
          v-model:borrowers="borrowers"
          question="How many borrowers are associated with this loan?"
          tile-noun="Borrower"
        />

        <LoanStep v-if="step === 1" v-model:loan="loan" title="Loan Details" />

        <RepaymentDetailsStep
          v-if="step === 2"
          v-model:frequency="frequency"
          v-model:amount-type="amountType"
          v-model:amount="amount"
        />

        <!-- Review -->
        <div v-if="step === 3" class="stack">
          <ReviewCard title="Borrowers" @edit="goTo(0)">
            <div v-for="(b, i) in borrowers" :key="i" class="review__row">
              <strong>Borrower {{ i + 1 }}</strong>
              <span>{{ b.firstName }} {{ b.lastName }} · {{ b.mobile }} · {{ b.email }}</span>
            </div>
          </ReviewCard>

          <ReviewCard title="Loan" @edit="goTo(1)">
            <div class="review__row">
              <strong>Loan Account</strong><span>{{ loan.accountNumber }}</span>
            </div>
          </ReviewCard>

          <ReviewCard title="Requested Change" @edit="goTo(2)">
            <div class="review__row">
              <strong>Frequency</strong><span class="cap">{{ frequency }}</span>
            </div>
            <div class="review__row">
              <strong>Repayment Amount</strong>
              <span>{{ amountType === 'minimum' ? 'Minimum amount' : formattedAmount }}</span>
            </div>
          </ReviewCard>
        </div>

        <!-- Sign -->
        <div v-if="step === 4" class="stack">
          <DeclarationCard
            v-model="agreed"
            title="Borrower Declaration"
            :content="declarationText"
          />

          <div v-for="(_, i) in signatures" :key="i" class="card">
            <h3 class="sig-title">Borrower {{ i + 1 }} Signature</h3>
            <p class="muted small">{{ borrowers[i]?.firstName }} {{ borrowers[i]?.lastName }}</p>
            <SignaturePad v-model="signatures[i]" />
          </div>

          <p class="audit-note">
            For your security, we record the date, time, IP address and device used
            to sign, as an audit trail for this request.
          </p>
        </div>

        <div v-if="errors.length || submitError" class="errors" role="alert">
          <p v-if="submitError">{{ submitError }}</p>
          <ul v-else>
            <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
          </ul>
        </div>

        <FormNav
          :can-go-back="step > 0"
          :is-last="step === STEPS.length - 1"
          :submitting="submitting"
          submit-label="Submit Repayment Change Request"
          @prev="prev"
          @next="next"
          @submit="submit"
        />
      </template>
    </main>
  </div>
</template>
