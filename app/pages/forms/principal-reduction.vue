<script setup lang="ts">
import type { Borrower } from '../../components/BorrowersStep.vue'

useHead({ title: 'Permanent Principal Reduction — WLTH Client Hub' })

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'reduction', label: 'Reduction' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
]

const step = ref(0)

// State
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([{ firstName: '', lastName: '', mobile: '', email: '' }])
const loan = ref({ accountNumber: '', comments: '' })
const amount = ref<number | null>(null)
const reason = ref('')
const acknowledged = ref(false)
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

const declarationText = `I/We request that WLTH process the permanent principal reduction described in this application.

I/We acknowledge that the requested amount will be applied to reduce the principal balance of the nominated loan.

I/We understand that this action may affect available redraw funds.

I/We confirm that all information provided is true and correct.`

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
    if (!(Number(amount.value) > 0)) e.push('Enter the amount you would like to reduce')
    if (!reason.value.trim()) e.push('Please tell us the reason for this reduction')
    if (!acknowledged.value) e.push('You must accept the acknowledgement')
  } else if (i === 4) {
    if (!agreed.value) e.push('You must accept the declaration')
    signatures.value.forEach((s, idx) => {
      if (!s) e.push(`Borrower ${idx + 1} must sign`)
    })
  }
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
    amount: Number(amount.value),
    reason: reason.value,
    acknowledgement: { accepted: acknowledged.value },
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
      '/api/requests/principal-reduction',
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
    'WLTH — Permanent Principal Reduction Request',
    result.value ? `Reference: ${result.value.reference}` : '',
    '',
    `Loan Account: ${loan.value.accountNumber}`,
    `Reduction Amount: ${formattedAmount.value}`,
    `Reason: ${reason.value}`,
    'Acknowledgement: Accepted',
    '',
    'Borrowers:',
    ...borrowers.value.map(
      (b, i) => `  ${i + 1}. ${b.firstName} ${b.lastName} — ${b.mobile} — ${b.email}`,
    ),
    '',
    'Signatures recorded on file for every borrower.',
  ]
  const blob = new Blob([lines.filter((l) => l !== '').join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.value?.reference ?? 'principal-reduction-request'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="form-page">
    <FormHeader
      title="Permanent Principal Reduction"
      subtitle="Apply available funds to permanently reduce your loan balance."
    />
    <ProgressStepper :steps="STEPS" :current="step" @goto="goTo" />

    <main class="form-main">
      <SuccessScreen
        v-if="result"
        heading="Principal Reduction Request Submitted"
        message="Thank you. Your Permanent Principal Reduction Request has been submitted to the WLTH team for review and processing.&#10;&#10;We will contact you if any additional information is required."
        :reference="result.reference"
        :download-href="`/api/requests/principal-reduction/${result.id}/pdf`"
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

        <PrincipalReductionStep
          v-if="step === 2"
          v-model:amount="amount"
          v-model:reason="reason"
          v-model:acknowledged="acknowledged"
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
              <strong>Loan Account Number</strong><span>{{ loan.accountNumber }}</span>
            </div>
          </ReviewCard>

          <ReviewCard title="Reduction" @edit="goTo(2)">
            <div class="review__row">
              <strong>Reduction Amount</strong><span>{{ formattedAmount }}</span>
            </div>
            <div class="review__row">
              <strong>Reason</strong><span>{{ reason }}</span>
            </div>
            <div class="review__row">
              <strong>Acknowledgement</strong><span>✓ Accepted</span>
            </div>
          </ReviewCard>
        </div>

        <!-- Sign -->
        <div v-if="step === 4" class="stack">
          <DeclarationCard
            v-model="agreed"
            title="Permanent Principal Reduction Declaration"
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
          submit-label="Submit Principal Reduction Request"
          @prev="prev"
          @next="next"
          @submit="submit"
        />
      </template>
    </main>
  </div>
</template>
