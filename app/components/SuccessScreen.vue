<script setup lang="ts">
import { icons } from '../assets/icons'

withDefaults(
  defineProps<{
    heading: string
    message: string
    reference?: string
    showDownload?: boolean
  }>(),
  { showDownload: false },
)
const emit = defineEmits<{ (e: 'download'): void }>()
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
      <button v-if="showDownload" type="button" class="btn btn--ghost" @click="emit('download')">
        Download Copy
      </button>
    </div>
  </section>
</template>
