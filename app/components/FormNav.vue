<script setup lang="ts">
withDefaults(
  defineProps<{
    canGoBack: boolean
    isLast: boolean
    submitting?: boolean
    submitLabel?: string
  }>(),
  { submitting: false, submitLabel: 'Submit' },
)
const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'submit'): void
}>()
</script>

<template>
  <div class="nav">
    <button v-if="canGoBack" type="button" class="btn btn--ghost" @click="emit('prev')">
      Previous
    </button>
    <span class="nav__spacer" />
    <button v-if="!isLast" type="button" class="btn btn--primary" @click="emit('next')">
      Next
    </button>
    <button
      v-else
      type="button"
      class="btn btn--submit"
      :disabled="submitting"
      @click="emit('submit')"
    >
      {{ submitting ? 'Submitting…' : submitLabel }}
    </button>
  </div>
</template>
