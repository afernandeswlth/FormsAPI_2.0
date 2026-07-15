<script setup lang="ts">
import type { Borrower } from '../../components/BorrowersStep.vue'
import { englishError } from '../../utils/english'
import { isValidAuPhone } from '../../utils/validators'

useHead({ title: 'Open Offset Account — WLTH Client Hub' })

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
]

const step = ref(0)

// State
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([
  { firstName: '', lastName: '', mobile: '', email: '', customerNumber: '' },
])
const loan = ref({ accountNumber: '', comments: '' })
const feePayment = ref<'' | 'redraw' | 'direct-debit'>('')
const agreed = ref(false)
const signatures = ref<string[]>([''])

const feeMethodLabel = computed(() =>
  feePayment.value === 'redraw'
    ? 'Available Redraw'
    : feePayment.value === 'direct-debit'
      ? 'Direct Debit from Nominated Account'
      : '',
)

// Mutually-exclusive checkboxes: each is checked when it is the chosen method,
// and selecting one switches the choice (v-model keeps the tick in sync).
const redrawChecked = computed({
  get: () => feePayment.value === 'redraw',
  set: (v) => {
    if (v) feePayment.value = 'redraw'
  },
})
const ddChecked = computed({
  get: () => feePayment.value === 'direct-debit',
  set: (v) => {
    if (v) feePayment.value = 'direct-debit'
  },
})

watch(borrowerCount, (n) => {
  const cur = signatures.value
  signatures.value =
    n > cur.length ? [...cur, ...Array.from({ length: n - cur.length }, () => '')] : cur.slice(0, n)
})

const declarationText = `I/We request that WLTH open an offset account linked to the nominated loan account.

I/We confirm that the information provided is true and correct.

I/We understand that the request will be reviewed before the account is opened.`

// ---- Validation ----
const errors = ref<string[]>([])
const showErrors = ref(false)
function validateStep(i: number): string[] {
  const e: string[] = []
  if (i === 0) {
    borrowers.value.forEach((b, idx) => {
      if (!b.firstName || !b.lastName) e.push(`Borrower ${idx + 1}: name is required`)
      if (!isValidAuPhone(b.mobile)) e.push(`Borrower ${idx + 1}: a valid Australian phone number is required`)
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) e.push(`Borrower ${idx + 1}: valid email required`)
      if (!b.customerNumber?.trim()) e.push(`Borrower ${idx + 1}: customer number is required`)
    })
  } else if (i === 1) {
    if (!loan.value.accountNumber.trim()) e.push('Loan account number is required')
    if (!feePayment.value) e.push('Select how the $250 variation fee will be paid')
  } else if (i === 3) {
    if (!agreed.value) e.push('You must confirm the declaration')
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
  if (e.length) {
    showErrors.value = true
    return
  }
  showErrors.value = false
  step.value = Math.min(step.value + 1, STEPS.length - 1)
  scrollTop()
}
function prev() {
  errors.value = []
  showErrors.value = false
  step.value = Math.max(step.value - 1, 0)
  scrollTop()
}
function goTo(i: number) {
  errors.value = []
  showErrors.value = false
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
  const e = validateStep(3)
  errors.value = e
  if (e.length) {
    showErrors.value = true
    return
  }
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
    feePayment: feePayment.value,
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
    const res = await $fetch<{ reference: string; id: string }>('/api/requests/open-offset', {
      method: 'POST',
      body: payload,
    })
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
    'WLTH — Open Offset Account Request',
    result.value ? `Reference: ${result.value.reference}` : '',
    '',
    `Loan Account: ${loan.value.accountNumber}`,
    `$250 Variation Fee paid via: ${feeMethodLabel.value}`,
    '',
    'Borrowers:',
    ...borrowers.value.map(
      (b, i) =>
        `  ${i + 1}. ${b.firstName} ${b.lastName} — Customer No. ${b.customerNumber} — ${b.mobile} — ${b.email}`,
    ),
    '',
    'Signatures recorded on file for every borrower.',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.value?.reference ?? 'open-offset-request'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="form-page">
    <FormHeader
      title="Open Offset Account"
      subtitle="Request the creation of a new offset account linked to your existing loan."
    />
    <ProgressStepper :steps="STEPS" :current="step" @goto="goTo" />

    <main class="form-main">
      <SuccessScreen
        v-if="result"
        heading="Offset Account Request Submitted"
        message="Thank you. Your request to open an offset account has been received.&#10;&#10;The WLTH team will review your application and contact you if any further information is required."
        :reference="result.reference"
        :download-href="`/api/requests/open-offset/${result.id}/pdf?ref=${result.reference}`"
      />

      <template v-else>
        <FormIntro
          v-if="step === 0"
          title="Open Offset Account"
          body="Use this form to apply to open an eligible offset account linked to your home loan. An offset account helps reduce the interest charged on your home loan by offsetting the balance held in your linked offset account against your eligible loan balance. Eligibility criteria and fees may apply. Each eligible home loan account can have only one offset account, and not all home loan products support offset accounts. Once your application is approved and your request has been processed, we will notify you of your new account details."
          pdf-href="/forms/open-offset.pdf"
        />

        <BorrowersStep
          v-if="step === 0"
          v-model:count="borrowerCount"
          v-model:borrowers="borrowers"
          :show-errors="showErrors"
          question="How many borrowers are associated with this loan?"
          tile-noun="Borrower"
          show-customer-number
        />

        <div v-if="step === 1" class="stack">
          <LoanStep v-model:loan="loan" :show-errors="showErrors" title="Loan To Link Offset Account" />
          <OffsetInformationCard />

          <div class="card">
            <h2>Offset Account Variation Fee</h2>
            <p class="fee-note">
              A <strong>$250.00 Offset Account Variation Fee</strong> applies. This fee
              can be paid either from available redraw funds or by direct debit from your
              nominated account.
            </p>

            <h3>How would you like to pay the $250.00 fee? <span class="req">*</span></h3>
            <div class="radios">
              <label class="radio" :class="{ 'is-selected': feePayment === 'redraw' }">
                <input type="checkbox" v-model="redrawChecked" />
                <span>Available Redraw</span>
              </label>
              <label class="radio" :class="{ 'is-selected': feePayment === 'direct-debit' }">
                <input type="checkbox" v-model="ddChecked" />
                <span>Direct Debit from Nominated Account</span>
              </label>
            </div>
            <span v-if="showErrors && !feePayment" class="field__err">
              Select how the $250 variation fee will be paid.
            </span>
          </div>
        </div>

        <!-- Review -->
        <div v-if="step === 2" class="stack">
          <ReviewCard title="Borrowers" @edit="goTo(0)">
            <div v-for="(b, i) in borrowers" :key="i" class="review__row">
              <strong>Borrower {{ i + 1 }}</strong>
              <span>
                {{ b.firstName }} {{ b.lastName }} · Customer No. {{ b.customerNumber }} ·
                {{ b.mobile }} · {{ b.email }}
              </span>
            </div>
          </ReviewCard>

          <ReviewCard title="Loan" @edit="goTo(1)">
            <div class="review__row">
              <strong>Loan Account Number</strong><span>{{ loan.accountNumber }}</span>
            </div>
            <div class="review__row">
              <strong>$250 Variation Fee</strong><span>{{ feeMethodLabel }}</span>
            </div>
          </ReviewCard>
        </div>

        <!-- Sign -->
        <div v-if="step === 3" class="stack">
          <DeclarationCard
            v-model="agreed"
            :show-errors="showErrors"
            title="Offset Account Request Declaration"
            :content="declarationText"
            agree-label="I confirm the above declaration."
          />

          <div v-for="(_, i) in signatures" :key="i" class="card">
            <h3 class="sig-title">Borrower {{ i + 1 }} Signature</h3>
            <p class="muted small">{{ borrowers[i]?.firstName }} {{ borrowers[i]?.lastName }}</p>
            <SignaturePad v-model="signatures[i]" :flag-unsigned="showErrors" />
          </div>

          <p class="audit-note">
            For your security, we record the date, time, IP address and device used
            to sign, as an audit trail for this request.
          </p>
        </div>

        <div v-if="submitError" class="errors" role="alert">
          <p>{{ submitError }}</p>
        </div>

        <FormNav
          :can-go-back="step > 0"
          :is-last="step === STEPS.length - 1"
          :submitting="submitting"
          submit-label="Submit Offset Account Request"
          @prev="prev"
          @next="next"
          @submit="submit"
        />
      </template>
    </main>
  </div>
</template>

<style scoped>
.fee-note {
  margin: 0 0 8px;
  padding: 14px 16px;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-left: 5px solid var(--aqua);
  border-radius: 12px;
  color: var(--ink);
  line-height: 1.55;
}
.fee-note strong {
  color: var(--navy);
}
</style>
