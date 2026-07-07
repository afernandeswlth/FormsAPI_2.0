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
  max-width: 1600px;
  margin: 0 auto;
  /* Fluid gutters that grow with the viewport */
  padding: 0 clamp(20px, 4vw, 64px);
}

.accent {
  color: var(--aqua);
}

.logo svg {
  display: block;
}
</style>
