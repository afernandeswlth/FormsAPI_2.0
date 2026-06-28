<script setup lang="ts">
import type { Borrower } from '../../components/BorrowersStep.vue'
import type { DestinationAccount } from '../../components/DestinationAccountStep.vue'
import type { RedrawPurpose } from '../../components/RedrawPurposeStep.vue'
import type { Attachment } from '../../components/AttachmentsField.vue'

useHead({ title: 'Redraw Request — WLTH Client Hub' })

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'amount', label: 'Amount' },
  { key: 'destination', label: 'Destination' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
]

const step = ref(0)
const EVIDENCE_THRESHOLD = 100000

// State
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([{ firstName: '', lastName: '', mobile: '', email: '' }])
const loan = ref({ accountNumber: '', comments: '' })
const amount = ref<number | null>(null)
const destination = ref<DestinationAccount>({ accountName: '', bsb: '', accountNumber: '' })
const purpose = ref<RedrawPurpose>('')
const reason = ref('')
const evidence = ref<Attachment[]>([])
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

const purposeLabels: Record<string, string> = {
  property: 'Property Purchase / Settlement',
  construction: 'Construction / Renovation',
  'third-party': 'Transfer To Third Party',
  personal: 'Transfer To My Own Account',
  other: 'Other',
}
const purposeLabel = computed(() => purposeLabels[purpose.value] ?? '—')

// Evidence is required for redraws over $100k, or for purposes that need proof.
const needsEvidence = computed(
  () =>
    Number(amount.value) > EVIDENCE_THRESHOLD ||
    ['property', 'construction', 'personal'].includes(purpose.value),
)
const evidenceRequiredCount = computed(() => (needsEvidence.value ? 1 : 0))
const evidenceHint = computed(() => {
  const base: Record<string, string> = {
    property: 'Upload your Contract of Sale or settlement documentation.',
    construction: 'Upload an invoice, contract, or builder documentation.',
    personal: 'Upload a recent bank statement or confirmation of account opening.',
    'third-party': 'Upload any supporting documentation for this redraw (optional).',
    other: 'Upload any supporting documentation for this redraw (optional).',
    '': 'Upload any supporting documentation for this redraw (optional).',
  }
  const over = Number(amount.value) > EVIDENCE_THRESHOLD
  const text = base[purpose.value] ?? base['']
  return over
    ? `${text} Required for redraws over $100,000. PDF, DOCX, or image.`
    : `${text} PDF, DOCX, or image.`
})

const declarationText = `I/We request that WLTH process the redraw described in this application.

I/We acknowledge that supporting evidence may be required.

I/We confirm that the information provided is true and correct.`

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
    if (!(Number(amount.value) > 0)) e.push('Enter the amount you would like to redraw')
  } else if (i === 3) {
    if (!destination.value.accountName) e.push('Account name is required')
    if (!/^\d{3}-?\d{3}$/.test(destination.value.bsb)) e.push('BSB must be 6 digits')
    if (!/^\d{5,10}$/.test(destination.value.accountNumber)) e.push('Account number must be 5–10 digits')
  } else if (i === 4) {
    if (!purpose.value) e.push('Select a redraw purpose')
    if (!reason.value.trim()) e.push('Please tell us how the funds will be used')
    if (evidenceRequiredCount.value > 0 && evidence.value.length < 1)
      e.push('Supporting documentation is required for this redraw')
  } else if (i === 6) {
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
  const e = validateStep(6)
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
    destination: destination.value,
    purpose: purpose.value,
    reason: reason.value,
    attachments: evidence.value,
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
    const res = await $fetch<{ reference: string; id: string }>('/api/requests/redraw', {
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
    'WLTH — Redraw Request',
    result.value ? `Reference: ${result.value.reference}` : '',
    '',
    `Loan Account: ${loan.value.accountNumber}`,
    `Redraw Amount: ${formattedAmount.value}`,
    `Purpose: ${purposeLabel.value}`,
    `Reason: ${reason.value}`,
    '',
    `Destination: ${destination.value.accountName} — BSB ${destination.value.bsb} — Acct ${destination.value.accountNumber}`,
    '',
    'Borrowers:',
    ...borrowers.value.map(
      (b, i) => `  ${i + 1}. ${b.firstName} ${b.lastName} — ${b.mobile} — ${b.email}`,
    ),
    '',
    `Documents: ${evidence.value.map((a) => a.name).join(', ') || 'None'}`,
    '',
    'Signatures recorded on file for every borrower.',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.value?.reference ?? 'redraw-request'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="form-page">
    <FormHeader
      title="Redraw Request"
      subtitle="Request access to available redraw funds from your loan."
    />
    <ProgressStepper :steps="STEPS" :current="step" @goto="goTo" />

    <main class="form-main">
      <SuccessScreen
        v-if="result"
        heading="Redraw Request Submitted"
        message="Thank you. Your redraw request has been received and is being reviewed by the WLTH team.&#10;&#10;We may contact you if additional documentation is required."
        :reference="result.reference"
        :download-href="`/api/requests/redraw/${result.id}/pdf`"
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

        <RedrawAmountStep v-if="step === 2" v-model:amount="amount" />

        <DestinationAccountStep v-if="step === 3" v-model="destination" />

        <template v-if="step === 4">
          <div class="stack">
            <RedrawPurposeStep v-model:purpose="purpose" v-model:reason="reason" />
            <div class="card">
              <AttachmentsField
                v-model="evidence"
                title="Supporting Documents"
                flush
                large
                accept=".pdf,.docx,image/*"
                :required-count="evidenceRequiredCount"
                :hint="evidenceHint"
              />
            </div>
          </div>
        </template>

        <!-- Review -->
        <div v-if="step === 5" class="stack">
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

          <ReviewCard title="Redraw Amount" @edit="goTo(2)">
            <div class="review__row">
              <strong>Amount</strong><span>{{ formattedAmount }}</span>
            </div>
          </ReviewCard>

          <ReviewCard title="Destination Account" @edit="goTo(3)">
            <div class="review__row">
              <strong>{{ destination.accountName }}</strong>
              <span>BSB {{ destination.bsb }} · XXXX{{ destination.accountNumber.slice(-4) }}</span>
            </div>
          </ReviewCard>

          <ReviewCard title="Purpose" @edit="goTo(4)">
            <div class="review__row">
              <strong>Purpose</strong><span>{{ purposeLabel }}</span>
            </div>
            <div class="review__row">
              <strong>Reason</strong><span>{{ reason }}</span>
            </div>
            <div class="review__row">
              <strong>Documents</strong>
              <span>{{ evidence.map((a) => a.name).join(', ') || 'None attached' }}</span>
            </div>
          </ReviewCard>
        </div>

        <!-- Sign -->
        <div v-if="step === 6" class="stack">
          <DeclarationCard v-model="agreed" title="Borrower Declaration" :content="declarationText" />

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
          submit-label="Submit Redraw Request"
          @prev="prev"
          @next="next"
          @submit="submit"
        />
      </template>
    </main>
  </div>
</template>
