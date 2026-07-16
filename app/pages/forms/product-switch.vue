<script setup lang="ts">
import type { Borrower } from '../../components/BorrowersStep.vue'
import type { ProductType } from '../../components/NewProductStep.vue'
import { englishError } from '../../utils/english'
import { isValidAuPhone } from '../../utils/validators'

useHead({ title: 'Product Switch Request — WLTH Client Hub' })

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'product', label: 'New Product' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
]

const step = ref(0)

// State
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([{ firstName: '', lastName: '', mobile: '', email: '' }])
const loan = ref({ accountNumber: '', comments: '' })
const productType = ref<ProductType>('')
const term = ref('')
const reason = ref('')
const agreed = ref(false)
const signatures = ref<string[]>([''])

watch(borrowerCount, (n) => {
  const cur = signatures.value
  signatures.value =
    n > cur.length ? [...cur, ...Array.from({ length: n - cur.length }, () => '')] : cur.slice(0, n)
})

const productLabels: Record<string, string> = {
  pi: 'Principal & Interest',
  io: 'Interest Only',
  fixed: 'Fixed Rate',
}
const productLabel = computed(() => productLabels[productType.value] ?? '—')
const needsTerm = computed(() => productType.value === 'io' || productType.value === 'fixed')

const declarationText = `I/We request that WLTH consider this Product Switch Request.

I/We acknowledge that submission of this request does not guarantee approval.

I/We understand that fees and charges may apply depending on the selected product and current loan arrangements.

I/We confirm that all information provided is true and correct.`

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
    })
  } else if (i === 1) {
    if (!loan.value.accountNumber.trim()) e.push('Loan account number is required')
  } else if (i === 2) {
    if (!productType.value) e.push('Select the product you would like to switch to')
    if (needsTerm.value && !term.value) e.push('Select a period for your chosen product')
    if (!reason.value.trim()) e.push('Please tell us why you would like to switch products')
  } else if (i === 4) {
    if (!agreed.value) e.push('You must accept the declaration')
    signatures.value.forEach((s, idx) => {
      if (!s) e.push(`Borrower ${idx + 1} must sign`)
    })
  }
  e.push(
    ...englishError({ borrowers: borrowers.value, loan: loan.value, term: term.value, reason: reason.value }),
  )
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
  const e = validateStep(4)
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
    productType: productType.value,
    term: needsTerm.value ? term.value : undefined,
    reason: reason.value,
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
    const res = await $fetch<{ reference: string; id: string }>('/api/requests/product-switch', {
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
    'WLTH — Product Switch Request',
    result.value ? `Reference: ${result.value.reference}` : '',
    '',
    `Loan Account: ${loan.value.accountNumber}`,
    `Requested Product: ${productLabel.value}`,
    needsTerm.value && term.value ? `Term: ${term.value}` : '',
    `Reason: ${reason.value}`,
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
  a.download = `${result.value?.reference ?? 'product-switch-request'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="form-page">
    <FormHeader
      title="Product Switch Request"
      subtitle="Request a change to your current loan product."
    />
    <ProgressStepper :steps="STEPS" :current="step" @goto="goTo" />

    <main class="form-main">
      <SuccessScreen
        v-if="result"
        heading="Product Switch Request Submitted"
        message="Thank you. Your Product Switch Request has been submitted to the WLTH team for assessment.&#10;&#10;A team member may contact you to discuss available options and any applicable fees or charges."
        :reference="result.reference"
        :download-href="`/api/requests/product-switch/${result.id}/pdf?ref=${result.reference}`"
      />

      <template v-else>
        <FormIntro
          v-if="step === 0"
          title="Product Switch Request"
          body="Use this form to request a change to another eligible home loan product, including switching between available variable and fixed interest rate options, repayment types, or other eligible product features. Product switches are subject to eligibility, approval, and the terms of your loan. Fees may apply, and if you are switching from a fixed interest rate loan, break costs and other charges may also apply. We recommend contacting our Customer Care team if you would like to understand the costs and implications before proceeding."
          pdf-href="/forms/product-switch.pdf"
        />

        <BorrowersStep
          v-if="step === 0"
          v-model:count="borrowerCount"
          v-model:borrowers="borrowers"
          :show-errors="showErrors"
          question="How many borrowers are associated with this loan?"
          tile-noun="Borrower"
        />

        <LoanStep v-if="step === 1" v-model:loan="loan" :show-errors="showErrors" title="Current Loan Details" />

        <NewProductStep
          v-if="step === 2"
          v-model:product-type="productType"
          v-model:term="term"
          v-model:reason="reason"
          :show-errors="showErrors"
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

          <ReviewCard title="New Product" @edit="goTo(2)">
            <div class="review__row">
              <strong>Selected Product</strong><span>{{ productLabel }}</span>
            </div>
            <div v-if="needsTerm && term" class="review__row">
              <strong>Term</strong><span>{{ term }}</span>
            </div>
            <div class="review__row">
              <strong>Reason</strong><span>{{ reason }}</span>
            </div>
          </ReviewCard>
        </div>

        <!-- Sign -->
        <div v-if="step === 4" class="stack">
          <DeclarationCard
            v-model="agreed"
            :show-errors="showErrors"
            title="Product Switch Declaration"
            :content="declarationText"
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
          submit-label="Submit Product Switch Request"
          @prev="prev"
          @next="next"
          @submit="submit"
        />
      </template>
    </main>
  </div>
</template>
