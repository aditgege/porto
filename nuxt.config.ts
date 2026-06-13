// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    '@vueuse/nuxt',
    'motion-v/nuxt',
    'nuxt-og-image',
    'nuxt-studio'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2024-11-01',

  nitro: {
    preset: 'cloudflare-pages',
    prerender: {
      routes: [
        '/'
      ],
      crawlLinks: true
    },
    externals: {
      external: [/\.node$/, /^better-sqlite3$/]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  ogImage: {
    enabled: true,
    runtimeCacheStorage: true,
    compatibility: {
      runtime: {
        resvg: 'wasm'
      }
    }
  },

  studio: {
    repository: {
      provider: 'github',
      owner: 'aditgege',
      repo: 'porto',
      branch: 'main'
    }
  }
})
