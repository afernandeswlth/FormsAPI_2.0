<script setup lang="ts">
/**
 * Informational intro shown at the start of each form: a form-specific
 * description plus the standard "Before you begin" notice and a link to
 * download the blank PDF version of the form.
 */
withDefaults(
  defineProps<{ title: string; body: string; pdfHref: string; pdfLabel?: string }>(),
  { pdfLabel: 'Download PDF form' },
)
</script>

<template>
  <section class="card intro">
    <h2>{{ title }}</h2>
    <p class="intro__body">{{ body }}</p>

    <div class="intro__notice">
      <h3>Before you begin</h3>
      <p class="intro__sub">Digital form requirements</p>
      <p>
        This digital form supports a maximum of 4 borrowers. All borrowers must complete and
        electronically sign the form on the same device during the same session.
      </p>
      <p>
        If your loan has more than 4 borrowers, or if all borrowers are unable to sign on the
        same device, please download the PDF version of this form, complete it manually, and
        email the completed form to
        <a href="mailto:hello@wlth.com">hello@wlth.com</a>.
      </p>

      <a class="intro__download" :href="pdfHref" download target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M12 3v12" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M7 10l5 5 5-5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M5 20h14" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ pdfLabel }}
      </a>

      <p>
        Depending on your request, we may contact you to verify your instructions or request
        additional supporting documentation before your request can be processed.
      </p>
      <p>
        If you require assistance, please contact our Customer Care team on
        <a href="tel:139584">13 95 84</a>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.intro__body {
  margin: 0 0 4px;
  color: var(--ink);
  line-height: 1.6;
}
.intro__notice {
  margin-top: 22px;
  padding: 20px 22px;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-left: 5px solid var(--blue);
  border-radius: 14px;
}
.intro__notice h3 {
  margin: 0 0 4px;
  color: var(--navy);
  font-size: 1.05rem;
}
.intro__notice p {
  margin: 0 0 12px;
  color: var(--muted);
  line-height: 1.55;
  font-size: 0.92rem;
}
.intro__notice p:last-child {
  margin-bottom: 0;
}
.intro__sub {
  font-weight: 700;
  color: var(--navy) !important;
  margin-bottom: 6px !important;
}
.intro__notice a {
  color: var(--blue);
  font-weight: 600;
}
.intro__download {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 16px;
  padding: 11px 22px;
  background: var(--primary-tint);
  color: var(--blue) !important;
  border: 1.5px solid var(--blue);
  border-radius: var(--radius-pill);
  font-weight: 600;
  text-decoration: none;
}
.intro__download:hover {
  background: var(--rb-100, #d9e2ff);
}
.intro__download svg {
  width: 20px;
  height: 20px;
}
</style>
