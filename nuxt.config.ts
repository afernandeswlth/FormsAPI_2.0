// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // Nuxt 4 directory + behaviour defaults
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  css: ['~/assets/css/brand.css', '~/assets/css/forms.css'],

  // WLTH brand tokens (WLTH Design System) exposed to the app + runtime
  appConfig: {
    brand: {
      text: '#FFFFFF',
      background: '#1F232D', // dark blue 600
      buttonText: '#FFFFFF',
      button: '#1445C7', // royal blue 500
      accent: '#04CA72', // WLTH green
    },
  },

  app: {
    head: {
      title: 'WLTH Client Hub',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Access and manage your WLTH loan through secure digital forms.',
        },
      ],
      link: [
        // WLTH brand typeface (SuisseIntl) is served from this CDN
        { rel: 'preconnect', href: 'https://assets.wlth.com', crossorigin: '' },
      ],
    },
  },

  nitro: {
    // Bundle the blank PDF templates so they're readable at runtime (incl. Vercel)
    serverAssets: [{ baseName: 'templates', dir: 'server/assets/templates' }],
    // Friendly default error shape for the API
    routeRules: {
      '/api/**': { cors: true },
    },
  },
})
