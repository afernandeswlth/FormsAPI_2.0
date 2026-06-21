<template>
  <NuxtPage />
</template>

<style>
/* ---------- Global base + WLTH brand tokens (applied app-wide) ---------- */
:root {
  --navy: #1f232d;
  --blue: #1445c7;
  --aqua: #00d9e7;
  --white: #ffffff;
  --bg: #f5f7fa;
  --ink: #1f232d;
  --muted: #5b6675;
  --line: #e2e8f0;
}

* {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
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
