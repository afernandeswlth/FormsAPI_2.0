<script setup lang="ts">
import { icons } from './assets/icons'

const { data: hub } = await useFetch('/api/hub')

// Ocean hero photography (sea turtle), served from public/.
const heroSrc = '/hero-turtle.jpg'
const heroLoaded = ref(true)
</script>

<template>
  <div class="page">
    <!-- HERO -->
    <header class="hero">
      <img
        class="hero__bg"
        :class="{ 'is-hidden': !heroLoaded }"
        :src="heroSrc"
        alt=""
        aria-hidden="true"
        @error="heroLoaded = false"
      />
      <div class="hero__overlay" />

      <nav class="hero__nav container">
        <span class="logo logo--light" v-html="icons.wlthWordmark" />
        <span class="logo logo--parley" v-html="icons.parley" />
      </nav>

      <div class="hero__body container">
        <div class="hero__copy">
          <h1 class="hero__title">
            Welcome to <span class="accent">WLTH</span><br />Client Hub
          </h1>
          <p class="hero__lede">
            Access and manage your loan through our secure digital forms.
          </p>
          <p class="hero__impact accent">
            Impact is what we do, Lending is how we do it.
          </p>
        </div>

        <div class="hero__badge" v-html="icons.certified" />
      </div>
    </header>

    <!-- MAIN -->
    <main class="main">
      <div class="container">
        <div class="main__head">
          <h2 class="main__title">What would you like to do today?</h2>
          <p class="main__sub">Choose an option below to get started.</p>
        </div>

        <div class="cards">
          <a
            v-for="opt in hub?.options"
            :key="opt.type"
            class="card"
            :href="opt.endpoint"
            @click.prevent
          >
            <span class="card__icon" v-html="icons[opt.type] ?? icons.fallback" />
            <h3 class="card__title">{{ opt.title }}</h3>
            <p class="card__desc">{{ opt.description }}</p>
            <span class="card__cta" aria-hidden="true" v-html="icons.arrow" />
          </a>
        </div>
      </div>

      <!-- IMPACT BAND -->
      <section class="band">
        <div class="container band__grid">
          <div class="band__item">
            <span class="band__icon" v-html="icons.shield" />
            <div>
              <strong>Australia's first<br />Certified Impact Lender.</strong>
              <p>
                Proudly part of the global movement creating positive impact for
                people and planet.
              </p>
            </div>
          </div>
          <div class="band__item">
            <span class="band__icon" v-html="icons.people" />
            <div>
              <strong>Proudly supporting<br />Parley for the Oceans.</strong>
              <p>Working together for a cleaner, healthier ocean.</p>
            </div>
          </div>
          <div class="band__item band__item--badge">
            <span class="band__badge" v-html="icons.certified" />
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="container footer__grid">
        <span class="logo logo--light footer__logo" v-html="icons.wlthWordmark" />
        <span class="footer__site"><b>WLTH</b> with.com</span>
        <span class="footer__legal">Privacy Policy <i>|</i> Terms &amp; Conditions</span>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --navy: #1f232d;
  --blue: #1445c7;
  --aqua: #00d9e7;
  --white: #ffffff;
  --grey: #eef2f6;
  --ink: #1f232d;
  --muted: #5b6675;
}

* {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink);
  background: var(--grey);
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

/* ---------- HERO ---------- */
.hero {
  position: relative;
  isolation: isolate;
  background: linear-gradient(160deg, #0a3d4a 0%, #102a3e 45%, var(--navy) 100%);
  color: var(--white);
  overflow: hidden;
}
.hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  z-index: -2;
}
.hero__bg.is-hidden {
  display: none;
}
.hero__overlay {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
      90deg,
      rgba(15, 27, 41, 0.92) 0%,
      rgba(15, 27, 41, 0.7) 38%,
      rgba(15, 27, 41, 0.25) 70%,
      rgba(15, 27, 41, 0.45) 100%
    );
}
.hero__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 28px;
  padding-bottom: 8px;
}
.logo--light svg {
  color: var(--white);
}
.hero__body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-top: 56px;
  padding-bottom: 96px;
}
.hero__title {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  line-height: 1.05;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 22px;
}
.hero__lede {
  font-size: clamp(1.05rem, 1.6vw, 1.35rem);
  font-weight: 400;
  max-width: 30ch;
  margin: 0 0 28px;
  color: rgba(255, 255, 255, 0.92);
}
.hero__impact {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}
.hero__badge {
  flex-shrink: 0;
}
.hero__badge svg {
  width: 96px;
  height: auto;
  color: var(--white);
}

/* ---------- MAIN ---------- */
.main {
  background: var(--grey);
}
.main__head {
  text-align: center;
  padding: 64px 0 36px;
}
.main__title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}
.main__sub {
  font-size: 1.05rem;
  color: var(--muted);
  margin: 0;
}

/* ---------- CARDS ---------- */
.cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  padding-bottom: 24px;
}
.card {
  flex: 1 1 220px;
  max-width: 250px;
  min-width: 220px;
  background: var(--white);
  border-radius: 20px;
  padding: 36px 28px 28px;
  text-align: center;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 30px rgba(16, 42, 62, 0.08);
  border: 1px solid rgba(16, 42, 62, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.card:hover,
.card:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(20, 69, 199, 0.16);
  outline: none;
}
.card__icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #eef6f9;
  display: grid;
  place-items: center;
  margin-bottom: 22px;
  color: #169aa6;
}
.card__icon svg {
  width: 36px;
  height: 36px;
}
.card__title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--navy);
  margin: 0 0 12px;
  line-height: 1.25;
}
.card__desc {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--muted);
  margin: 0 0 22px;
  flex-grow: 1;
}
.card__cta {
  color: #169aa6;
}
.card__cta svg {
  width: 26px;
  height: 26px;
}

/* ---------- IMPACT BAND ---------- */
.band {
  background: #dfeef2;
  margin-top: 40px;
}
.band__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  align-items: center;
  padding: 40px 24px;
}
.band__item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex: 1 1 280px;
}
.band__item strong {
  display: block;
  color: var(--navy);
  font-size: 1rem;
  margin-bottom: 6px;
}
.band__item p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.45;
}
.band__icon {
  color: #169aa6;
  flex-shrink: 0;
}
.band__icon svg {
  width: 40px;
  height: 40px;
}
.band__item--badge {
  justify-content: flex-end;
}
.band__badge svg {
  width: 84px;
  color: var(--navy);
}

/* ---------- FOOTER ---------- */
.footer {
  background: var(--navy);
  color: rgba(255, 255, 255, 0.85);
}
.footer__grid {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 26px 24px;
  font-size: 0.85rem;
}
.footer__logo svg {
  height: 22px;
  width: auto;
}
.footer__site b {
  color: var(--aqua);
}
.footer__legal {
  margin-left: auto;
}
.footer__legal i {
  color: rgba(255, 255, 255, 0.3);
  font-style: normal;
  margin: 0 8px;
}

@media (max-width: 760px) {
  .hero__body {
    flex-direction: column;
    padding-bottom: 64px;
  }
  .hero__badge svg {
    width: 76px;
  }
  .band__item--badge {
    justify-content: flex-start;
  }
  .footer__grid {
    flex-wrap: wrap;
  }
  .footer__legal {
    margin-left: 0;
    width: 100%;
  }
}
</style>
