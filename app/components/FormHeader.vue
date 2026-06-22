<script setup lang="ts">
import { icons } from '../assets/icons'
defineProps<{ title: string; subtitle: string }>()
</script>

<template>
  <div>
    <nav class="topbar">
      <NuxtLink to="/" class="back">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </svg>
        Back to Hub
      </NuxtLink>
      <span class="logo" aria-label="WLTH" v-html="icons.wlthWordmark" />
    </nav>
    <header class="strip">
      <div class="container">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </header>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 14px 8px 10px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  color: var(--navy);
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;
  background: #fff;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.back:hover {
  border-color: var(--blue);
  background: rgba(20, 69, 199, 0.04);
}
</style>
