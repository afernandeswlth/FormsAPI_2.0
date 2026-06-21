<script setup lang="ts">
import { icons } from '../assets/icons'
defineProps<{ title: string; subtitle: string }>()
</script>

<template>
  <div>
    <nav class="topbar">
      <NuxtLink to="/" class="logo" v-html="icons.wlthWordmark" />
      <span class="logo" v-html="icons.parley" />
    </nav>
    <header class="strip">
      <div class="container">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </header>
  </div>
</template>
