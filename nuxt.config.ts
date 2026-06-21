// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // Nuxt 4 directory + behaviour defaults
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  // WLTH brand tokens exposed to the app + runtime
  appConfig: {
    brand: {
      text: '#FFFFFF',
      background: '#1F232D', // dark navy
      buttonText: '#FFFFFF',
      button: '#1445C7', // royal blue
      accent: '#00D9E7', // aqua
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
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },

  nitro: {
    // Friendly default error shape for the API
    routeRules: {
      '/api/**': { cors: true },
    },
  },
})
