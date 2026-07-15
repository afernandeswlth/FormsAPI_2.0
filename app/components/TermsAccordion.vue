<script setup lang="ts">
const agreed = defineModel<boolean>({ required: true })
withDefaults(
  defineProps<{
    title: string
    content: string
    agreeLabel?: string
    showErrors?: boolean
  }>(),
  { agreeLabel: '', showErrors: false },
)
const open = ref(false)
</script>

<template>
  <div class="card">
    <button
      type="button"
      class="accordion__head"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="accordion__chev" :class="{ 'is-open': open }">▸</span>
      {{ title }}
    </button>
    <div v-show="open" class="declaration">{{ content }}</div>
    <label class="check">
      <input v-model="agreed" type="checkbox" />
      <span>{{ agreeLabel || `I have read and agree to the ${title}.` }}</span>
    </label>
    <span v-if="showErrors && !agreed" class="field__err">
      You must accept the terms to continue.
    </span>
  </div>
</template>
