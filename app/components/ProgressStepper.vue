<script setup lang="ts">
defineProps<{
  steps: { key: string; label: string }[]
  current: number
}>()
const emit = defineEmits<{ (e: 'goto', index: number): void }>()
</script>

<template>
  <div class="progress" role="navigation" aria-label="Form steps">
    <div class="container progress__row">
      <button
        v-for="(s, i) in steps"
        :key="s.key"
        class="progress__step"
        :class="{ 'is-active': i === current, 'is-done': i < current }"
        type="button"
        :aria-current="i === current ? 'step' : undefined"
        @click="i < current ? emit('goto', i) : null"
      >
        <span class="progress__dot">
          <svg
            v-if="i < current"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 12l5 5L20 6" />
          </svg>
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="progress__label">{{ s.label }}</span>
      </button>
    </div>
  </div>
</template>
