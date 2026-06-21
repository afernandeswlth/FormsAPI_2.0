<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ (e: 'edit'): void }>()
</script>

<template>
  <div class="card review">
    <div class="review__head">
      <h3>{{ title }}</h3>
      <button type="button" class="edit" @click="emit('edit')">Edit</button>
    </div>
    <slot />
  </div>
</template>
