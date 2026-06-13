<script setup lang="ts">
const { global } = useAppConfig()

useSeoMeta({
  title: 'Showcase — UI Building Blocks',
  ogTitle: 'Showcase — UI Building Blocks',
  description: 'Custom Vue components, page sections, and live demos I built for this portfolio. Steal the parts you like.',
  ogDescription: 'Custom Vue components, page sections, and live demos I built for this portfolio.'
})

const tabs = [
  {
    label: 'Components',
    icon: 'i-lucide-component',
    slot: 'components' as const
  },
  {
    label: 'Sections',
    icon: 'i-lucide-layout-template',
    slot: 'sections' as const
  },
  {
    label: 'Demos',
    icon: 'i-lucide-play-circle',
    slot: 'demos' as const
  }
]

// Sample data for live previews
const polaroidImages = [
  { src: '/hero/random-1.avif', alt: 'Workspace' },
  { src: '/hero/random-2.avif', alt: 'Code & Coffee' },
  { src: '/hero/random-3.avif', alt: 'Architecture' },
  { src: '/hero/random-4.avif', alt: 'UI Build' }
]

const marqueeImages = [
  { src: '/hero/random-1.avif', alt: 'Workspace' },
  { src: '/hero/random-2.avif', alt: 'Code & Coffee' },
  { src: '/hero/random-3.avif', alt: 'Architecture' },
  { src: '/hero/random-4.avif', alt: 'UI Build' },
  { src: '/hero/random-5.avif', alt: 'Vue & Nuxt' },
  { src: '/hero/random-6.avif', alt: 'Daily Setup' }
]

const fakeTestimonials = [
  {
    quote: 'Aditia led our Vue 2 to Composition API migration without a single day of downtime.',
    author: {
      name: 'Engineering Lead',
      description: 'Sunwell System Technologies',
      avatar: { src: '/me/gelap.jpg', alt: 'Engineering Lead' }
    }
  },
  {
    quote: 'Working with Aditia on Single-SPA integration was seamless. He delivered a unified dashboard that just worked.',
    author: {
      name: 'Tech Lead',
      description: 'Moladin',
      avatar: { src: '/me/gelap.jpg', alt: 'Tech Lead' }
    }
  }
]

const fakeFaq = [
  {
    label: 'How is this page structured?',
    content: 'Tabs split content into Components, Sections, and Demos. Each block has a live preview followed by the source you can copy.'
  },
  {
    label: 'Are these reusable?',
    content: 'Yes. Most pieces are plain Vue + Nuxt UI v4 + motion-v. Copy the block, paste into your own project, adjust props.'
  }
]

// Code samples
const polaroidUsage = `<PolaroidItem
  v-for="(image, index) in images"
  :key="index"
  :image="image"
  :index="index"
/>`

const projectEmbedUsage = `<ProjectEmbed
  src="https://example.com/demo"
  title="Live demo"
  aspect="16/9"
/>`

const marqueeUsage = `<UMarquee pause-on-hover class="py-2 [--duration:40s]">
  <NuxtImg
    v-for="(img, i) in images"
    :key="i"
    :src="img.src"
    :alt="img.alt"
    width="234"
    height="234"
    class="rounded-lg aspect-square object-cover"
    :class="i % 2 === 0 ? '-rotate-2' : 'rotate-2'"
  />
</UMarquee>`

const motionWrapUsage = `<Motion
  :initial="{ scale: 1.1, opacity: 0, filter: 'blur(20px)' }"
  :animate="{ scale: 1, opacity: 1, filter: 'blur(0px)' }"
  :transition="{ duration: 0.6, delay: 0.1 }"
>
  <h1>{{ title }}</h1>
</Motion>`

function copy(text: string) {
  copyToClipboard(text, 'Snippet copied')
}
</script>

<template>
  <UPage>
    <UPageHero
      title="Showcase"
      description="A field guide to the custom components, sections, and live demos powering this portfolio. Each block ships with a working preview and the source you can lift."
      :ui="{
        title: '!mx-0 text-left',
        description: '!mx-0 text-left',
        links: 'justify-start'
      }"
    >
      <template #links>
        <div class="flex items-center gap-2">
          <UButton
            label="Get the source"
            icon="i-lucide-github"
            color="neutral"
            to="https://github.com/aditgege/porto"
            target="_blank"
          />
          <UButton
            :label="`Email ${global.email}`"
            variant="ghost"
            color="neutral"
            icon="i-lucide-mail"
            :to="`mailto:${global.email}`"
          />
        </div>
      </template>
    </UPageHero>

    <UPageSection
      :ui="{
        container: '!pt-0'
      }"
    >
      <UTabs
        :items="tabs"
        variant="link"
        class="gap-8"
        :ui="{
          list: 'border-b border-default'
        }"
      >
        <!-- Components tab -->
        <template #components>
          <div class="space-y-12 pt-6">
            <!-- PolaroidItem -->
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  PolaroidItem
                </h2>
                <p class="text-sm text-muted mt-1">
                  Tilted polaroid card with hover scale + rotation reset. Used on the About page to display location photos.
                </p>
              </header>
              <div class="rounded-xl border border-default bg-elevated/30 p-6">
                <div class="flex flex-row justify-center items-center py-6 space-x-[-2rem]">
                  <PolaroidItem
                    v-for="(image, index) in polaroidImages"
                    :key="index"
                    :image="image"
                    :index="index"
                  />
                </div>
              </div>
              <div class="relative mt-3 group">
                <pre class="text-xs bg-elevated/60 border border-default rounded-lg p-4 overflow-x-auto"><code>{{ polaroidUsage }}</code></pre>
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Copy snippet"
                  @click="copy(polaroidUsage)"
                />
              </div>
            </section>

            <!-- ProjectEmbed -->
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  ProjectEmbed
                </h2>
                <p class="text-sm text-muted mt-1">
                  iframe wrapper with toolbar (traffic-light dots, fullscreen, open-in-tab) and lazy loader. Drop it inside any blog post via MDC.
                </p>
              </header>
              <div class="rounded-xl border border-default bg-elevated/30 p-6">
                <ProjectEmbed
                  src="https://nuxt.com"
                  title="nuxt.com (sample embed)"
                  :height="320"
                />
              </div>
              <div class="relative mt-3 group">
                <pre class="text-xs bg-elevated/60 border border-default rounded-lg p-4 overflow-x-auto"><code>{{ projectEmbedUsage }}</code></pre>
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Copy snippet"
                  @click="copy(projectEmbedUsage)"
                />
              </div>
            </section>

            <!-- Motion wrapper -->
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  Motion entrance pattern
                </h2>
                <p class="text-sm text-muted mt-1">
                  Reusable scale + blur intro built on motion-v. Wrap any node and stagger via the <code class="text-xs">delay</code> prop.
                </p>
              </header>
              <div class="rounded-xl border border-default bg-elevated/30 p-10 flex justify-center">
                <Motion
                  :initial="{ scale: 1.1, opacity: 0, filter: 'blur(20px)' }"
                  :while-in-view="{ scale: 1, opacity: 1, filter: 'blur(0px)' }"
                  :transition="{ duration: 0.6, delay: 0.1 }"
                  :in-view-options="{ once: false }"
                >
                  <div class="px-6 py-4 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                    I fade in with a scale + blur
                  </div>
                </Motion>
              </div>
              <div class="relative mt-3 group">
                <pre class="text-xs bg-elevated/60 border border-default rounded-lg p-4 overflow-x-auto"><code>{{ motionWrapUsage }}</code></pre>
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Copy snippet"
                  @click="copy(motionWrapUsage)"
                />
              </div>
            </section>
          </div>
        </template>

        <!-- Sections tab -->
        <template #sections>
          <div class="space-y-12 pt-6">
            <!-- Hero marquee -->
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  Hero photo marquee
                </h2>
                <p class="text-sm text-muted mt-1">
                  Auto-scrolling photo strip with alternating tilt. Pauses on hover. Powered by <code class="text-xs">UMarquee</code>.
                </p>
              </header>
              <div class="rounded-xl border border-default bg-elevated/30 py-6 overflow-hidden">
                <UMarquee
                  pause-on-hover
                  class="py-2 [--duration:40s]"
                >
                  <NuxtImg
                    v-for="(img, index) in marqueeImages"
                    :key="index"
                    width="200"
                    height="200"
                    class="rounded-lg aspect-square object-cover mx-2"
                    :class="index % 2 === 0 ? '-rotate-2' : 'rotate-2'"
                    v-bind="img"
                  />
                </UMarquee>
              </div>
              <div class="relative mt-3 group">
                <pre class="text-xs bg-elevated/60 border border-default rounded-lg p-4 overflow-x-auto"><code>{{ marqueeUsage }}</code></pre>
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="soft"
                  class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Copy snippet"
                  @click="copy(marqueeUsage)"
                />
              </div>
            </section>

            <!-- Testimonials -->
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  Testimonials carousel
                </h2>
                <p class="text-sm text-muted mt-1">
                  Looping <code class="text-xs">UCarousel</code> with auto-advance + dots. Quote marks added via CSS pseudo-elements.
                </p>
              </header>
              <div class="rounded-xl border border-default bg-elevated/30 p-6">
                <UCarousel
                  v-slot="{ item }"
                  :items="fakeTestimonials"
                  :autoplay="{ delay: 4000 }"
                  loop
                  dots
                >
                  <UPageCTA
                    :description="item.quote"
                    variant="naked"
                    class="rounded-none"
                    :ui="{
                      container: 'sm:py-8 lg:py-8 sm:gap-6',
                      description: '!text-base text-balance'
                    }"
                  >
                    <UUser
                      v-bind="item.author"
                      size="lg"
                      class="justify-center"
                    />
                  </UPageCTA>
                </UCarousel>
              </div>
            </section>

            <!-- FAQ -->
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  FAQ accordion
                </h2>
                <p class="text-sm text-muted mt-1">
                  Built on <code class="text-xs">UAccordion</code>. Categories live in <code class="text-xs">content/index.yml</code> for easy editing.
                </p>
              </header>
              <div class="rounded-xl border border-default bg-elevated/30 p-6">
                <UAccordion :items="fakeFaq" />
              </div>
            </section>
          </div>
        </template>

        <!-- Demos tab -->
        <template #demos>
          <div class="space-y-12 pt-6">
            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  Randomize Lyric
                </h2>
                <p class="text-sm text-muted mt-1">
                  Tiny web toy embedded in
                  <ULink
                    to="/blog/randomize-lyric-demo"
                    class="text-primary"
                  >
                    a blog post
                  </ULink>
                  . Read about it there, or play with it right here.
                </p>
              </header>
              <ProjectEmbed
                src="/blog/randomize-lyric-demo"
                title="Randomize Lyric — interactive demo"
                :height="500"
              />
            </section>

            <section>
              <header class="mb-4">
                <h2 class="text-xl font-semibold">
                  More coming soon
                </h2>
                <p class="text-sm text-muted mt-1">
                  POS prototypes, micro-frontend playgrounds, and migration timelines will land here. Want me to ship one for your team?
                </p>
              </header>
              <div class="rounded-xl border border-dashed border-default bg-elevated/20 p-10 flex flex-col items-center justify-center gap-3 text-center">
                <UIcon
                  name="i-lucide-rocket"
                  class="size-8 text-muted"
                />
                <p class="text-sm text-muted max-w-sm">
                  Have a frontend problem worth a live demo? Drop me a line and I'll ship a sandboxed prototype.
                </p>
                <UButton
                  :to="`mailto:${global.email}`"
                  icon="i-lucide-mail"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  label="Start a conversation"
                />
              </div>
            </section>
          </div>
        </template>
      </UTabs>
    </UPageSection>
  </UPage>
</template>
