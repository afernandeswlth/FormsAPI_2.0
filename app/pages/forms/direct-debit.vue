<script setup lang="ts">
import { icons } from '../../assets/icons'

useHead({ title: 'Direct Debit Request — WLTH Client Hub' })

type Borrower = { firstName: string; lastName: string; mobile: string; email: string }
type LinkedAccount = {
  financialInstitution: string
  branch: string
  accountName: string
  bsb: string
  accountNumber: string
}

const STEPS = [
  { key: 'borrowers', label: 'Borrowers' },
  { key: 'loan', label: 'Loan' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'repayments', label: 'Repayments' },
  { key: 'review', label: 'Review' },
  { key: 'sign', label: 'Sign' },
] as const

const step = ref(0) // 0-indexed

// ---- Step 1: Borrowers ----
const borrowerCount = ref(1)
const borrowers = ref<Borrower[]>([blankBorrower()])
function blankBorrower(): Borrower {
  return { firstName: '', lastName: '', mobile: '', email: '' }
}
watch(borrowerCount, (n) => {
  resize(borrowers, n, blankBorrower)
  resize(signatures, n, () => '')
})

// ---- Step 2: Loan ----
const loan = ref({ accountNumber: '', comments: '' })

// ---- Step 3: Linked accounts ----
const accountCount = ref(1)
const linkedAccounts = ref<LinkedAccount[]>([blankAccount()])
function blankAccount(): LinkedAccount {
  return { financialInstitution: '', branch: '', accountName: '', bsb: '', accountNumber: '' }
}
watch(accountCount, (n) => resize(linkedAccounts, n, blankAccount))

// ---- Step 3: Bank statement attachment(s) ----
type Attachment = { name: string; type: string; size: number; content: string }
const attachments = ref<Attachment[]>([])
const attachmentError = ref('')
const dragging = ref(false)
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/heic', 'image/webp']

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function addFiles(files: FileList | File[]) {
  attachmentError.value = ''
  for (const f of Array.from(files)) {
    if (f.size > MAX_FILE_BYTES) {
      attachmentError.value = `${f.name} is larger than 10MB.`
      continue
    }
    if (f.type && !ACCEPTED.includes(f.type)) {
      attachmentError.value = `${f.name} is not a supported file type (PDF or image).`
      continue
    }
    const content = await readAsDataURL(f)
    attachments.value.push({ name: f.name, type: f.type, size: f.size, content })
  }
}

async function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) await addFiles(input.files)
  input.value = '' // allow re-selecting the same file
}

async function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) await addFiles(e.dataTransfer.files)
}

function removeAttachment(i: number) {
  attachments.value.splice(i, 1)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ---- Step 4: Repayments ----
const repayment = ref<{
  frequency: 'weekly' | 'fortnightly' | 'monthly' | ''
  amountType: 'minimum' | 'other' | ''
  amount: number | null
}>({ frequency: '', amountType: '', amount: null })

// ---- Step 6: Sign ----
const agreed = ref(false)
const signatures = ref<string[]>([''])

function resize<T>(arr: Ref<T[]>, n: number, make: () => T) {
  const cur = arr.value
  if (n > cur.length) {
    arr.value = [...cur, ...Array.from({ length: n - cur.length }, make)]
  } else {
    arr.value = cur.slice(0, n)
  }
}

// ---- Per-step validation ----
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
    linkedAccounts.value.forEach((a, idx) => {
      if (!a.financialInstitution || !a.accountName)
        e.push(`Linked Account ${idx + 1}: financial institution and account name are required`)
      if (!/^\d{3}-?\d{3}$/.test(a.bsb)) e.push(`Linked Account ${idx + 1}: BSB must be 6 digits`)
      if (!/^\d{5,10}$/.test(a.accountNumber)) e.push(`Linked Account ${idx + 1}: account number 5–10 digits`)
    })
    const need = linkedAccounts.value.length
    if (attachments.value.length < need)
      e.push(
        `Attach at least ${need} bank statement${need > 1 ? 's' : ''} (one per linked account)`,
      )
  } else if (i === 3) {
    if (!repayment.value.frequency) e.push('Select a payment frequency')
    if (!repayment.value.amountType) e.push('Select a repayment amount option')
    if (repayment.value.amountType === 'other' && !(Number(repayment.value.amount) > 0))
      e.push('Enter the repayment amount')
  } else if (i === 5) {
    if (!agreed.value) e.push('You must accept the Direct Debit Service Agreement')
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
  const e = validateStep(5)
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
    comments: loan.value.comments || undefined,
    linkedAccounts: linkedAccounts.value,
    attachments: attachments.value,
    repayment: {
      frequency: repayment.value.frequency,
      amountType: repayment.value.amountType,
      amount: repayment.value.amountType === 'other' ? Number(repayment.value.amount) : undefined,
    },
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
      '/api/requests/direct-debit',
      { method: 'POST', body: payload },
    )
    result.value = { reference: res.reference, id: res.id }
    scrollTop()
  } catch (err: any) {
    const fieldErrors = err?.data?.data?.errors?.fieldErrors
    submitError.value = fieldErrors
      ? 'Please review your details — some fields need attention.'
      : 'Something went wrong submitting your request. Please try again.'
  } finally {
    submitting.value = false
  }
}

const freqOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
] as const

const declarationText = `Direct Debit Service Agreement

This Direct Debit Request (DDR) and DDR Service Agreement sets out the terms on which you authorise WLTH and its sponsoring financial institution to arrange for funds to be debited from your nominated account.

1. We will advise you, in writing, of the details of your direct debit arrangements (amount, frequency and commencement) at least 14 days prior to the first drawing.

2. We will only arrange for funds to be debited from your account as authorised in the Direct Debit Request, or as otherwise advised to you in accordance with this agreement.

3. If a drawing falls on a day that is not a business day, we may direct your financial institution to debit your account on the following business day.

4. It is your responsibility to ensure that sufficient cleared funds are available in your nominated account to meet each drawing on its due date. If a drawing is dishonoured, fees may be payable by you and the drawing may be re-attempted.

5. You may alter, defer, stop or cancel this arrangement by giving us at least 7 business days' notice. You may also contact your financial institution directly.

6. We will keep all information relating to your nominated account confidential, except where required for the purposes of conducting direct debits with your financial institution, or as required by law.

7. Direct debiting may not be available on all accounts. You should check your account details against a recent statement and confirm with your financial institution if you are uncertain.

By signing this request you acknowledge that you have read and understood this DDR Service Agreement and authorise the direct debit arrangements described above.`
</script>

<template>
  <div class="ddr">
    <!-- HEADER (same as Client Hub) -->
    <nav class="topbar">
      <NuxtLink to="/" class="logo" v-html="icons.wlthWordmark" />
      <span class="logo" v-html="icons.parley" />
    </nav>

    <!-- HERO STRIP -->
    <header class="strip">
      <div class="container">
        <h1>Direct Debit Request</h1>
        <p>Set up or update your direct debit arrangements.</p>
      </div>
    </header>

    <!-- PROGRESS -->
    <div class="progress" role="navigation" aria-label="Form steps">
      <div class="container progress__row">
        <button
          v-for="(s, i) in STEPS"
          :key="s.key"
          class="progress__step"
          :class="{ 'is-active': i === step, 'is-done': i < step }"
          type="button"
          :aria-current="i === step ? 'step' : undefined"
          @click="i < step ? goTo(i) : null"
        >
          <span class="progress__dot">
            <svg v-if="i < step" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6" /></svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="progress__label">{{ s.label }}</span>
        </button>
      </div>
    </div>

    <main class="container ddr__main">
      <!-- SUCCESS -->
      <section v-if="result" class="card card--success">
        <div class="success__icon" v-html="icons.shield" />
        <h2>Request submitted</h2>
        <p>
          Your Direct Debit Request has been received. Your reference is
          <strong>{{ result.reference }}</strong>.
        </p>
        <p class="muted">We'll be in touch to confirm your arrangement.</p>
        <NuxtLink to="/" class="btn btn--primary">Back to Client Hub</NuxtLink>
      </section>

      <template v-else>
        <!-- STEP 1: BORROWERS -->
        <section v-if="step === 0" class="card">
          <h2>How many borrowers are on this loan?</h2>
          <div class="tiles">
            <button
              v-for="n in 4"
              :key="n"
              type="button"
              class="tile"
              :class="{ 'is-selected': borrowerCount === n }"
              @click="borrowerCount = n"
            >
              {{ n }}
            </button>
          </div>

          <div v-for="(b, i) in borrowers" :key="i" class="subsection">
            <h3>Borrower {{ i + 1 }}</h3>
            <div class="grid2">
              <label class="field">
                <span>First Name</span>
                <input v-model="b.firstName" type="text" autocomplete="given-name" />
              </label>
              <label class="field">
                <span>Last Name</span>
                <input v-model="b.lastName" type="text" autocomplete="family-name" />
              </label>
              <label class="field">
                <span>Mobile</span>
                <input v-model="b.mobile" type="tel" inputmode="tel" autocomplete="tel" />
              </label>
              <label class="field">
                <span>Email</span>
                <input v-model="b.email" type="email" inputmode="email" autocomplete="email" />
              </label>
            </div>
          </div>
        </section>

        <!-- STEP 2: LOAN -->
        <section v-if="step === 1" class="card">
          <h2>Loan Details</h2>
          <label class="field">
            <span>Loan Account Number</span>
            <input v-model="loan.accountNumber" type="text" inputmode="numeric" />
          </label>
          <label class="field">
            <span>Comments <em>(optional)</em></span>
            <textarea v-model="loan.comments" rows="4" />
          </label>
        </section>

        <!-- STEP 3: LINKED ACCOUNTS -->
        <section v-if="step === 2" class="card">
          <h2>How many accounts would you like linked?</h2>
          <div class="tiles">
            <button
              v-for="n in 4"
              :key="n"
              type="button"
              class="tile tile--wide"
              :class="{ 'is-selected': accountCount === n }"
              @click="accountCount = n"
            >
              {{ n }} {{ n === 1 ? 'Account' : 'Accounts' }}
            </button>
          </div>

          <div v-for="(a, i) in linkedAccounts" :key="i" class="acct">
            <h3>Linked Account {{ i + 1 }}</h3>
            <div class="grid2">
              <label class="field">
                <span>Financial Institution</span>
                <input v-model="a.financialInstitution" type="text" />
              </label>
              <label class="field">
                <span>Branch <em>(optional)</em></span>
                <input v-model="a.branch" type="text" />
              </label>
              <label class="field field--full">
                <span>Account Name</span>
                <input v-model="a.accountName" type="text" />
              </label>
              <label class="field">
                <span>BSB</span>
                <input v-model="a.bsb" type="text" inputmode="numeric" placeholder="062-000" />
              </label>
              <label class="field">
                <span>Account Number</span>
                <input v-model="a.accountNumber" type="text" inputmode="numeric" />
              </label>
            </div>
          </div>

          <div class="uploads">
            <h3>
              Bank Statements <span class="req">*</span>
              <span class="upload-count" :class="{ 'is-met': attachments.length >= linkedAccounts.length }">
                {{ attachments.length }} / {{ linkedAccounts.length }} added
              </span>
            </h3>
            <p class="muted small">
              Please attach a recent bank statement for
              <strong>each linked account</strong> —
              {{ linkedAccounts.length }} required. PDF or image, up to 10MB each.
            </p>

            <label
              class="dropzone"
              :class="{ 'is-drag': dragging }"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop.prevent="onDrop"
            >
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                class="dropzone__input"
                @change="onFileInput"
              />
              <span class="dropzone__icon" v-html="icons.upload" />
              <span class="dropzone__text">
                <strong>Add file</strong> or drag and drop
              </span>
            </label>

            <ul v-if="attachments.length" class="files">
              <li v-for="(a, i) in attachments" :key="i" class="file">
                <span class="file__icon" v-html="icons.fileDoc" />
                <span class="file__meta">
                  <strong>{{ a.name }}</strong>
                  <em>{{ formatSize(a.size) }}</em>
                </span>
                <button
                  type="button"
                  class="file__remove"
                  :aria-label="`Remove ${a.name}`"
                  v-html="icons.trash"
                  @click="removeAttachment(i)"
                />
              </li>
            </ul>

            <p v-if="attachmentError" class="file-err">{{ attachmentError }}</p>
          </div>
        </section>

        <!-- STEP 4: REPAYMENTS -->
        <section v-if="step === 3" class="card">
          <h2>Repayment Details</h2>

          <h3>Payment Frequency</h3>
          <div class="tiles">
            <button
              v-for="f in freqOptions"
              :key="f.value"
              type="button"
              class="tile tile--wide"
              :class="{ 'is-selected': repayment.frequency === f.value }"
              @click="repayment.frequency = f.value"
            >
              {{ f.label }}
            </button>
          </div>

          <h3>Repayment Amount</h3>
          <div class="radios">
            <label class="radio" :class="{ 'is-selected': repayment.amountType === 'minimum' }">
              <input v-model="repayment.amountType" type="radio" value="minimum" />
              <span>Minimum Required</span>
            </label>
            <label class="radio" :class="{ 'is-selected': repayment.amountType === 'other' }">
              <input v-model="repayment.amountType" type="radio" value="other" />
              <span>Other Amount</span>
            </label>
          </div>

          <label v-if="repayment.amountType === 'other'" class="field field--money">
            <span>Amount</span>
            <div class="money">
              <i>$</i>
              <input v-model.number="repayment.amount" type="number" min="0" step="0.01" inputmode="decimal" />
            </div>
          </label>
        </section>

        <!-- STEP 5: REVIEW -->
        <section v-if="step === 4" class="stack">
          <div class="card review">
            <div class="review__head">
              <h3>Borrowers</h3>
              <button type="button" class="edit" @click="goTo(0)">Edit</button>
            </div>
            <div v-for="(b, i) in borrowers" :key="i" class="review__row">
              <strong>Borrower {{ i + 1 }}</strong>
              <span>{{ b.firstName }} {{ b.lastName }} · {{ b.mobile }} · {{ b.email }}</span>
            </div>
          </div>

          <div class="card review">
            <div class="review__head">
              <h3>Loan</h3>
              <button type="button" class="edit" @click="goTo(1)">Edit</button>
            </div>
            <div class="review__row">
              <strong>Account</strong><span>{{ loan.accountNumber }}</span>
            </div>
            <div v-if="loan.comments" class="review__row">
              <strong>Comments</strong><span>{{ loan.comments }}</span>
            </div>
          </div>

          <div class="card review">
            <div class="review__head">
              <h3>Linked Accounts</h3>
              <button type="button" class="edit" @click="goTo(2)">Edit</button>
            </div>
            <div v-for="(a, i) in linkedAccounts" :key="i" class="review__row">
              <strong>Account {{ i + 1 }}</strong>
              <span>{{ a.accountName }} — {{ a.financialInstitution }} · BSB {{ a.bsb }} · {{ a.accountNumber }}</span>
            </div>
            <div class="review__row">
              <strong>Bank statement</strong>
              <span>{{ attachments.map((a) => a.name).join(', ') || '—' }}</span>
            </div>
          </div>

          <div class="card review">
            <div class="review__head">
              <h3>Repayment Details</h3>
              <button type="button" class="edit" @click="goTo(3)">Edit</button>
            </div>
            <div class="review__row">
              <strong>Frequency</strong><span class="cap">{{ repayment.frequency }}</span>
            </div>
            <div class="review__row">
              <strong>Amount</strong>
              <span>{{ repayment.amountType === 'other' ? '$' + repayment.amount : 'Minimum Required' }}</span>
            </div>
          </div>
        </section>

        <!-- STEP 6: SIGN -->
        <section v-if="step === 5" class="stack">
          <div class="card">
            <h2>Sign &amp; Submit</h2>
            <div class="declaration" tabindex="0">{{ declarationText }}</div>
            <label class="check">
              <input v-model="agreed" type="checkbox" />
              <span>I have read and agree to the Direct Debit Service Agreement.</span>
            </label>
          </div>

          <div v-for="(_, i) in signatures" :key="i" class="card">
            <h3 class="sig-title">Borrower {{ i + 1 }} Signature</h3>
            <p class="muted small">{{ borrowers[i]?.firstName }} {{ borrowers[i]?.lastName }}</p>
            <SignaturePad v-model="signatures[i]" />
          </div>

          <p class="audit-note">
            For your security, we record the date, time, IP address and device used
            to sign, as an audit trail for this request.
          </p>
        </section>

        <!-- ERRORS -->
        <div v-if="errors.length || submitError" class="errors" role="alert">
          <p v-if="submitError">{{ submitError }}</p>
          <ul v-else>
            <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
          </ul>
        </div>

        <!-- NAV -->
        <div class="nav">
          <button v-if="step > 0" type="button" class="btn btn--ghost" @click="prev">
            Previous
          </button>
          <span class="nav__spacer" />
          <button
            v-if="step < STEPS.length - 1"
            type="button"
            class="btn btn--primary"
            @click="next"
          >
            Next
          </button>
          <button
            v-else
            type="button"
            class="btn btn--submit"
            :disabled="submitting"
            @click="submit"
          >
            {{ submitting ? 'Submitting…' : 'Submit Direct Debit Request' }}
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.ddr {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 80px;
}

/* Header */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  max-width: 1120px;
  margin: 0 auto;
}
.topbar :deep(svg) {
  color: var(--navy);
}

/* Hero strip */
.strip {
  background: var(--navy);
  min-height: 140px;
  display: flex;
  align-items: center;
  color: #fff;
}
.strip h1 {
  margin: 0 0 6px;
  font-size: clamp(1.7rem, 3.4vw, 2.3rem);
  font-weight: 700;
  letter-spacing: -0.01em;
}
.strip p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.05rem;
}

/* Progress */
.progress {
  background: #fff;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 10;
}
.progress__row {
  display: flex;
  justify-content: space-between;
  padding: 18px 24px;
  gap: 4px;
}
.progress__step {
  flex: 1;
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: default;
  position: relative;
  color: var(--muted);
  font: inherit;
  padding: 0;
}
.progress__step.is-done {
  cursor: pointer;
}
/* connector line */
.progress__step::before {
  content: '';
  position: absolute;
  top: 15px;
  left: -50%;
  width: 100%;
  height: 2px;
  background: var(--line);
  z-index: 0;
}
.progress__step:first-child::before {
  display: none;
}
.progress__step.is-active::before,
.progress__step.is-done::before {
  background: var(--blue);
}
.progress__dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  z-index: 1;
}
.progress__step.is-active .progress__dot {
  background: var(--blue);
  border-color: var(--blue);
  color: #fff;
}
.progress__step.is-done .progress__dot {
  background: var(--aqua);
  border-color: var(--aqua);
  color: var(--navy);
}
.progress__label {
  font-size: 0.78rem;
  font-weight: 500;
}
.progress__step.is-active .progress__label {
  color: var(--blue);
  font-weight: 700;
}

/* Main */
.ddr__main {
  max-width: 900px;
  margin-top: 36px;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.card {
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(16, 42, 62, 0.06);
}
.card h2 {
  margin: 0 0 24px;
  font-size: 1.5rem;
  color: var(--navy);
}
.card h3 {
  font-size: 1.1rem;
  color: var(--navy);
  margin: 28px 0 14px;
}

/* Selection tiles */
.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 8px;
}
.tile {
  min-width: 72px;
  min-height: 72px;
  border-radius: 14px;
  border: 2px solid var(--line);
  background: #fff;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--navy);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tile--wide {
  min-width: 140px;
  font-size: 1.05rem;
  padding: 0 20px;
}
.tile:hover {
  border-color: var(--blue);
}
.tile.is-selected {
  background: var(--blue);
  border-color: var(--blue);
  color: #fff;
}

/* Fields */
.subsection,
.acct {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.acct {
  border-top: none;
  border-left: 5px solid var(--aqua);
  padding: 20px 0 4px 22px;
  margin-top: 24px;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

/* Uploads */
.uploads {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.uploads h3 {
  margin-top: 0;
}
.req {
  color: #d92d20;
}
.upload-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  background: #eef2f6;
  padding: 3px 10px;
  border-radius: 999px;
  margin-left: 8px;
  vertical-align: middle;
}
.upload-count.is-met {
  color: #067647;
  background: #e7f6ec;
}
.dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 96px;
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  background: #fbfcfe;
  cursor: pointer;
  color: var(--muted);
  text-align: center;
  padding: 16px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.dropzone:hover,
.dropzone.is-drag {
  border-color: var(--blue);
  background: rgba(20, 69, 199, 0.04);
}
.dropzone__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}
.dropzone__icon {
  color: var(--blue);
}
.dropzone__icon :deep(svg) {
  width: 26px;
  height: 26px;
}
.dropzone__text strong {
  color: var(--blue);
}
.files {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.file {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.file__icon {
  color: var(--blue);
  flex-shrink: 0;
}
.file__icon :deep(svg) {
  width: 24px;
  height: 24px;
}
.file__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.file__meta strong {
  font-size: 0.92rem;
  color: var(--navy);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file__meta em {
  font-style: normal;
  font-size: 0.8rem;
  color: var(--muted);
}
.file__remove {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 8px;
}
.file__remove:hover {
  color: #d92d20;
  background: #fef2f2;
}
.file__remove :deep(svg) {
  width: 20px;
  height: 20px;
}
.file-err {
  color: #b91c1c;
  font-size: 0.85rem;
  margin: 12px 0 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--navy);
}
.field--full {
  grid-column: 1 / -1;
}
.field em {
  color: var(--muted);
  font-weight: 400;
}
.field input,
.field textarea {
  min-height: 52px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  font-weight: 400;
  color: var(--ink);
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.field textarea {
  resize: vertical;
  min-height: 96px;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(20, 69, 199, 0.12);
}
.field--money .money {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  max-width: 260px;
}
.field--money i {
  padding: 0 14px;
  color: var(--muted);
  font-style: normal;
  font-weight: 700;
}
.field--money input {
  border: none;
  border-radius: 0;
  flex: 1;
}
.field--money input:focus {
  box-shadow: none;
}

/* Radios */
.radios {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
}
.radio {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 18px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  color: var(--navy);
}
.radio.is-selected {
  border-color: var(--blue);
  background: rgba(20, 69, 199, 0.04);
}
.radio input {
  width: 20px;
  height: 20px;
  accent-color: var(--blue);
}

/* Review */
.review__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.review__head h3 {
  margin: 0;
}
.edit {
  background: none;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 8px 18px;
  min-height: 40px;
  color: var(--blue);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.edit:hover {
  border-color: var(--blue);
}
.review__row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  font-size: 0.95rem;
}
.review__row strong {
  min-width: 120px;
  color: var(--navy);
}
.review__row span {
  color: var(--muted);
}
.cap {
  text-transform: capitalize;
}

/* Declaration + sign */
.declaration {
  max-height: 280px;
  overflow-y: auto;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 22px;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--muted);
  background: #fbfcfe;
}
.check {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
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
.sig-title {
  margin-top: 0;
}
.audit-note {
  font-size: 0.85rem;
  color: var(--muted);
  text-align: center;
  margin: 0;
}

/* Success */
.card--success {
  text-align: center;
}
.success__icon {
  color: var(--aqua);
  margin: 0 auto 12px;
  width: 56px;
}
.success__icon :deep(svg) {
  width: 56px;
  height: 56px;
}
.card--success h2 {
  margin-bottom: 12px;
}

/* Errors */
.errors {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 14px;
  padding: 16px 20px;
  margin-top: 20px;
  font-size: 0.9rem;
}
.errors ul {
  margin: 0;
  padding-left: 18px;
}
.errors p {
  margin: 0;
}

/* Buttons / nav */
.nav {
  display: flex;
  align-items: center;
  margin-top: 28px;
  gap: 14px;
}
.nav__spacer {
  flex: 1;
}
.btn {
  border: none;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  padding: 0 28px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn--primary {
  background: var(--blue);
  color: #fff;
}
.btn--primary:hover {
  background: #0f37a3;
}
.btn--ghost {
  background: #fff;
  border: 1.5px solid var(--line);
  color: var(--navy);
}
.btn--submit {
  background: var(--blue);
  color: #fff;
  width: 100%;
  height: 60px;
  font-size: 18px;
  border-radius: 12px;
}
.btn--submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.muted {
  color: var(--muted);
}
.small {
  font-size: 0.85rem;
}

/* Mobile-first: stack everything, full-width controls */
@media (max-width: 720px) {
  .card {
    padding: 24px 20px;
  }
  .grid2 {
    grid-template-columns: 1fr;
  }
  .progress__label {
    display: none;
  }
  .ddr__main {
    margin-top: 20px;
  }
  .tile--wide {
    flex: 1;
  }
  .nav {
    flex-wrap: wrap;
  }
  .btn--primary,
  .btn--ghost {
    flex: 1;
  }
}
</style>
