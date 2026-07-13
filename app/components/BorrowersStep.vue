<script setup lang="ts">
import { stripDigits, isValidName, isValidAuPhone, isValidEmail } from '../utils/validators'

export type Borrower = {
  firstName: string
  lastName: string
  mobile: string
  email: string
  customerNumber?: string
}

const count = defineModel<number>('count', { required: true })
const borrowers = defineModel<Borrower[]>('borrowers', { required: true })

withDefaults(
  defineProps<{
    question: string
    tileNoun?: string
    showCustomerNumber?: boolean
    showErrors?: boolean
  }>(),
  { tileNoun: '', showCustomerNumber: false, showErrors: false },
)

function blank(): Borrower {
  return { firstName: '', lastName: '', mobile: '', email: '', customerNumber: '' }
}

watch(count, (n) => {
  const cur = borrowers.value
  borrowers.value =
    n > cur.length
      ? [...cur, ...Array.from({ length: n - cur.length }, blank)]
      : cur.slice(0, n)
})
</script>

<template>
  <section class="card">
    <h2>{{ question }}</h2>
    <div class="tiles">
      <button
        v-for="n in 4"
        :key="n"
        type="button"
        class="tile"
        :class="{ 'is-selected': count === n, 'tile--wide': tileNoun }"
        @click="count = n"
      >
        <template v-if="tileNoun">{{ n }} {{ tileNoun }}{{ n > 1 ? 's' : '' }}</template>
        <template v-else>{{ n }}</template>
      </button>
    </div>

    <div v-for="(b, i) in borrowers" :key="i" class="subsection">
      <h3>Borrower {{ i + 1 }}</h3>
      <div class="grid2">
        <label class="field">
          <span>First Name</span>
          <input
            v-model="b.firstName"
            type="text"
            autocomplete="given-name"
            placeholder="e.g. John"
            :class="{ invalid: showErrors && !isValidName(b.firstName) }"
            @input="b.firstName = stripDigits(b.firstName)"
          />
          <span v-if="showErrors && !isValidName(b.firstName)" class="field__err">
            Enter a first name (letters only).
          </span>
        </label>
        <label class="field">
          <span>Last Name</span>
          <input
            v-model="b.lastName"
            type="text"
            autocomplete="family-name"
            placeholder="e.g. Smith"
            :class="{ invalid: showErrors && !isValidName(b.lastName) }"
            @input="b.lastName = stripDigits(b.lastName)"
          />
          <span v-if="showErrors && !isValidName(b.lastName)" class="field__err">
            Enter a last name (letters only).
          </span>
        </label>
        <label class="field">
          <span>Mobile Number</span>
          <input
            v-model="b.mobile"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="e.g. 0412 345 678"
            :class="{ invalid: showErrors && !isValidAuPhone(b.mobile) }"
          />
          <span v-if="showErrors && !isValidAuPhone(b.mobile)" class="field__err">
            Enter a valid Australian phone number (e.g. 0412 345 678).
          </span>
        </label>
        <label class="field">
          <span>Email Address</span>
          <input
            v-model="b.email"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="e.g. john@example.com"
            :class="{ invalid: showErrors && !isValidEmail(b.email) }"
          />
          <span v-if="showErrors && !isValidEmail(b.email)" class="field__err">
            Enter a valid email address.
          </span>
        </label>
        <label v-if="showCustomerNumber" class="field field--full">
          <span>Customer Number</span>
          <input
            v-model="b.customerNumber"
            type="text"
            inputmode="numeric"
            placeholder="e.g. 1234567"
            :class="{ invalid: showErrors && !b.customerNumber?.trim() }"
          />
          <span v-if="showErrors && !b.customerNumber?.trim()" class="field__err">
            Customer number is required.
          </span>
        </label>
      </div>
    </div>
  </section>
</template>
