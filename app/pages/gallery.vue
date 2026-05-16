<script setup lang="ts">
const { data: page } = await useAsyncData('gallery-page', () => {
  return queryCollection('pages').path('/gallery').first()
})

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true
  })
}

useSeoMeta({
  title: page.value?.title,
  ogTitle: page.value?.title,
  description: page.value?.description,
  ogDescription: page.value?.description
})
</script>

<template>
  <UPage v-if="page">
    <UPageHero
      :title="page.title"
      :description="page.description"
      :ui="{
        title: '!mx-0 text-left',
        description: '!mx-0 text-left'
      }"
    />

    <div class="columns-1 sm:columns-2 md:columns-3 gap-4 pt-8">
      <Motion
        v-for="(img, idx) in page.images"
        :key="img.src"
        :initial="{ opacity: 0, y: 20 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :transition="{ delay: idx * 0.1 }"
        :in-view-options="{ once: true }"
        class="mb-4 inline-block w-full"
      >
        <NuxtImg
          :src="img.src"
          :alt="img.alt"
          class="w-full rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
          loading="lazy"
          format="webp"
        />
      </Motion>
    </div>
  </UPage>
</template>
