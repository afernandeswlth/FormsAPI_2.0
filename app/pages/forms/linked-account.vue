<script setup lang="ts">
import type { Borrower } from '../../components/BorrowersStep.vue'
import type { LinkedAccount } from '../../components/LinkedAccountsStep.vue'
import type { Attachment } from '../../components/AttachmentsField.vue'
import { directDebitTerms } from '../../assets/terms'
import { englishError } from '../../utils/english'
import { isValidAuPhone } from '../../utils/validators'

useHead({ title: 'Linked Account Nomination — WLTH Client Hub' })

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
]

const step = ref(0)

// State
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([
  { firstName: '', lastName: '', mobile: '', email: '' },
])
const loan = ref({ accountNumber: '', comments: '', smsfTrustName: '' })
const linkedAccounts = ref<LinkedAccount[]>([
  {
    linkTo: 'loan',
    offsetAccountNumber: '',
    financialInstitution: '',
    branch: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
  },
])
const attachments = ref<Attachment[]>([])
const agreed = ref(false)
const signatures = ref<string[]>([''])

// If an SMSF trust name is provided, repayments can't come from the loan account.
const smsfProvided = computed(() => !!loan.value.smsfTrustName?.trim())
const requiredStatements = computed(() => linkedAccounts.value.length)
const attachmentHint = computed(
  () =>
    `A bank statement is required for each linked account (${requiredStatements.value} required). PDF or image, up to 10MB each.`,
)

// Force any "loan account" selections to offset once an SMSF trust name is set.
watch(smsfProvided, (on) => {
  if (on) linkedAccounts.value.forEach((a) => (a.linkTo = a.linkTo === 'loan' ? 'offset' : a.linkTo))
})

// Keep one signature slot per borrower.
watch(borrowerCount, (n) => {
  const cur = signatures.value
  signatures.value =
    n > cur.length ? [...cur, ...Array.from({ length: n - cur.length }, () => '')] : cur.slice(0, n)
})

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
    linkedAccounts.value.forEach((a, idx) => {
      if (smsfProvided.value && a.linkTo === 'loan')
        e.push(`Linked Account ${idx + 1}: choose Offset account (an SMSF trust name was provided)`)
      if (a.linkTo === 'offset' && !/^\d{5,10}$/.test(a.offsetAccountNumber.replace(/\D/g, '')))
        e.push(`Linked Account ${idx + 1}: a valid offset account number (5–10 digits) is required`)
      if (!a.accountName.trim()) e.push(`Linked Account ${idx + 1}: account name is required`)
    })
    if (attachments.value.length < requiredStatements.value)
      e.push(
        `Attach a bank statement for each linked account (${requiredStatements.value} required)`,
      )
  } else if (i === 4) {
    if (!agreed.value) e.push('You must accept the Direct Debit Terms and Conditions')
    signatures.value.forEach((s, idx) => {
      if (!s) e.push(`Borrower ${idx + 1} must sign`)
    })
  }
  e.push(
    ...englishError({
      borrowers: borrowers.value,
      loan: loan.value,
      linkedAccounts: linkedAccounts.value,
    }),
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
    comments: loan.value.comments || undefined,
    smsfTrustName: loan.value.smsfTrustName || undefined,
    linkedAccounts: linkedAccounts.value,
    attachments: attachments.value,
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
      '/api/requests/linked-account',
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

// ---- Download a plain-text copy of the submission ----
function downloadCopy() {
  const lines = [
    'WLTH — Linked Account Nomination',
    result.value ? `Reference: ${result.value.reference}` : '',
    '',
    `Loan Account: ${loan.value.accountNumber}`,
    loan.value.comments ? `Comments: ${loan.value.comments}` : '',
    '',
    'Borrowers:',
    ...borrowers.value.map(
      (b, i) => `  ${i + 1}. ${b.firstName} ${b.lastName} — ${b.mobile} — ${b.email}`,
    ),
    '',
    'Linked Accounts:',
    ...linkedAccounts.value.map(
      (a, i) =>
        `  ${i + 1}. ${a.accountName} — ${a.financialInstitution}${a.branch ? ' (' + a.branch + ')' : ''} — BSB ${a.bsb} — Acct ${a.accountNumber}`,
    ),
    '',
    'Signatures recorded on file for every borrower.',
  ]
  const blob = new Blob([lines.filter((l) => l !== undefined).join('\n')], {
    type: 'text/plain',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.value?.reference ?? 'linked-account-nomination'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="form-page">
    <FormHeader
      title="Linked Account Nomination"
      subtitle="Add a new account to your WLTH loan."
    />
    <ProgressStepper :steps="STEPS" :current="step" @goto="goTo" />

    <main class="form-main">
      <SuccessScreen
        v-if="result"
        heading="Linked Account Nomination Submitted"
        message="Thank you. Your request has been received and will be reviewed by the WLTH team.&#10;&#10;A confirmation email has been sent to your nominated email address."
        :reference="result.reference"
        :download-href="`/api/requests/linked-account/${result.id}/pdf`"
      />

      <template v-else>
        <BorrowersStep
          v-if="step === 0"
          v-model:count="borrowerCount"
          v-model:borrowers="borrowers"
          :show-errors="showErrors"
          question="How many borrowers are associated with this loan?"
          tile-noun="Borrower"
        />

        <LoanStep v-if="step === 1" v-model:loan="loan" :show-errors="showErrors" title="Loan Information" show-smsf />

        <LinkedAccountsStep
          v-if="step === 2"
          v-model:accounts="linkedAccounts"
          :smsf-provided="smsfProvided"
          :show-errors="showErrors"
        >
          <AttachmentsField
            v-model="attachments"
            title="Bank Statements"
            :required-count="requiredStatements"
            :hint="attachmentHint"
          />
        </LinkedAccountsStep>

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
            <div v-if="loan.smsfTrustName" class="review__row">
              <strong>SMSF Trust Name</strong><span>{{ loan.smsfTrustName }}</span>
            </div>
            <div v-if="loan.comments" class="review__row">
              <strong>Comments</strong><span>{{ loan.comments }}</span>
            </div>
          </ReviewCard>

          <ReviewCard title="Linked Accounts" @edit="goTo(2)">
            <div v-for="(a, i) in linkedAccounts" :key="i" class="review__row">
              <strong>Account {{ i + 1 }}</strong>
              <span>
                Link to {{ a.linkTo === 'offset' ? `Offset ${a.offsetAccountNumber}` : 'Loan Account' }} ·
                {{ a.accountName }} — {{ a.financialInstitution }} · BSB {{ a.bsb }} · {{ a.accountNumber }}
              </span>
            </div>
            <div class="review__row">
              <strong>Bank statements</strong>
              <span>{{ attachments.map((a) => a.name).join(', ') || 'None attached' }}</span>
            </div>
          </ReviewCard>
        </div>

        <!-- Sign -->
        <div v-if="step === 4" class="stack">
          <TermsAccordion
            v-model="agreed"
            title="Direct Debit Terms & Conditions"
            :content="directDebitTerms"
            agree-label="I have read and agree to the Direct Debit Terms and Conditions."
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
          submit-label="Submit Linked Account Nomination"
          @prev="prev"
          @next="next"
          @submit="submit"
        />
      </template>
    </main>
  </div>
</template>
