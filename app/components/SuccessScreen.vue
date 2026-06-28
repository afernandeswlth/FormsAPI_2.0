<script setup lang="ts">
import { icons } from '../assets/icons'

withDefaults(
  defineProps<{
    heading: string
    message: string
    reference?: string
    /** When set, shows a "Download Submission Copy" link to this URL. */
    downloadHref?: string
  }>(),
  { downloadHref: '' },
)
</script>

<template>
  <section class="card card--success">
    <div class="success__icon" v-html="icons.check" />
    <h2>{{ heading }}</h2>
    <p class="success__msg">{{ message }}</p>
    <p v-if="reference" class="success__ref">
      Reference: <strong>{{ reference }}</strong>
    </p>
    <div class="success__actions">
      <NuxtLink to="/" class="btn btn--primary">Return to Client Hub</NuxtLink>
      <a v-if="downloadHref" :href="downloadHref" class="btn btn--ghost">
        Download Submission Copy
      </a>
    </div>
  </section>
</template>
