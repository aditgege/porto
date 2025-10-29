export default defineAppConfig({
  global: {
    picture: {
      dark: '/me/gelap.jpg',
      light: '/me/gelap.jpg',
      alt: 'My profile picture'
    },
    meetingLink: 'emailto:aditgege@gmail.com',
    email: 'aditgege@gmail.com',
    available: true
  },
  ui: {
    colors: {
      primary: 'lime',
      neutral: 'neutral'
    },
    pageHero: {
      slots: {
        container: 'py-18 sm:py-24 lg:py-32',
        title: 'mx-auto max-w-xl text-pretty text-3xl sm:text-4xl lg:text-5xl',
        description: 'mt-2 text-md mx-auto max-w-2xl text-pretty sm:text-md text-muted'
      }
    }
  },
  footer: {
    credits: `Built with Nuxt UI • © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [
      {
        'icon': 'i-simple-icons-instagram',
        'to': 'https://instagram.com/aditgege',
        'target': '_blank',
        'aria-label': 'Instagram Profile'
      },
      {
        'icon': 'i-simple-icons-github',
        'to': 'https://github.com/aditgege',
        'target': '_blank',
        'aria-label': 'GitHub Profile'
      }
    ]
  }
})
