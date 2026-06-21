<script setup lang="ts">
const agreed = defineModel<boolean>({ required: true })
withDefaults(
  defineProps<{ title?: string; content: string; agreeLabel?: string }>(),
  { title: 'Borrower Declaration', agreeLabel: 'I have read and agree to the above declaration.' },
)
</script>

<template>
  <div class="card">
    <h2>{{ title }}</h2>
    <div class="declaration declaration--open">{{ content }}</div>
    <label class="check">
      <input v-model="agreed" type="checkbox" />
      <span>{{ agreeLabel }}</span>
    </label>
  </div>
</template>

<style scoped>
.declaration--open {
  max-height: none;
}
</style>
