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
  /* Scale with the viewport (small proportional gutters) up to a 2000px cap so
     large monitors are actually used instead of boxed into a narrow column. */
  max-width: min(2000px, 96vw);
  margin: 0 auto;
  padding: 0 clamp(16px, 2.5vw, 44px);
}

.accent {
  color: var(--aqua);
}

.logo svg {
  display: block;
}
</style>
