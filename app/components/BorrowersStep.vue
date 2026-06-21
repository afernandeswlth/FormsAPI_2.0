<script setup lang="ts">
export type Borrower = {
  firstName: string
  lastName: string
  mobile: string
  email: string
}

const count = defineModel<number>('count', { required: true })
const borrowers = defineModel<Borrower[]>('borrowers', { required: true })

withDefaults(
  defineProps<{ question: string; tileNoun?: string }>(),
  { tileNoun: '' },
)

function blank(): Borrower {
  return { firstName: '', lastName: '', mobile: '', email: '' }
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
          <input v-model="b.firstName" type="text" autocomplete="given-name" />
        </label>
        <label class="field">
          <span>Last Name</span>
          <input v-model="b.lastName" type="text" autocomplete="family-name" />
        </label>
        <label class="field">
          <span>Mobile Number</span>
          <input v-model="b.mobile" type="tel" inputmode="tel" autocomplete="tel" />
        </label>
        <label class="field">
          <span>Email Address</span>
          <input v-model="b.email" type="email" inputmode="email" autocomplete="email" />
        </label>
      </div>
    </div>
  </section>
</template>
