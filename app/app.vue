<template>
  <NuxtPage />
</template>

<style>
/* ---------- Global base (brand tokens live in assets/css/brand.css) ---------- */
* {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

.container {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
}

.accent {
  color: var(--aqua);
}

.logo svg {
  display: block;
}
</style>
