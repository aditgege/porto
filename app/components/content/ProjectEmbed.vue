<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** URL of the deployed demo to embed */
  src: string
  /** Optional title shown in the toolbar */
  title?: string
  /** Fixed height in pixels. If set, overrides aspect ratio */
  height?: number | string
  /** Aspect ratio when height is not provided (default 16/9) */
  aspect?: '16/9' | '4/3' | '1/1' | '21/9'
  /** iframe `allow` attribute (camera, microphone, etc.) */
  allow?: string
  /** iframe sandbox tokens. Default keeps things safe but interactive */
  sandbox?: string
}>(), {
  title: 'Live demo',
  aspect: '16/9',
  allow: '',
  sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups'
})

const loaded = ref(false)
const isFullscreen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const aspectClass = computed(() => {
  if (props.height) return ''
  return {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '21/9': 'aspect-[21/9]'
  }[props.aspect]
})

const heightStyle = computed(() => {
  if (!props.height) return undefined
  return typeof props.height === 'number' ? `${props.height}px` : props.height
})

async function toggleFullscreen() {
  if (!containerRef.value) return
  if (!document.fullscreenElement) {
    await containerRef.value.requestFullscreen?.()
    isFullscreen.value = true
  } else {
    await document.exitFullscreen?.()
    isFullscreen.value = false
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div
    ref="containerRef"
    class="not-prose my-6 rounded-lg border border-default bg-elevated overflow-hidden"
    :class="{ 'fixed inset-0 z-50 my-0 rounded-none': isFullscreen }"
  >
    <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-default bg-default">
      <div class="flex items-center gap-2 min-w-0">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="size-2.5 rounded-full bg-red-400" />
          <span class="size-2.5 rounded-full bg-yellow-400" />
          <span class="size-2.5 rounded-full bg-green-400" />
        </div>
        <span class="text-xs text-muted truncate">
          {{ title }}
        </span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <UButton
          :icon="isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="toggleFullscreen"
        />
        <UButton
          :to="src"
          target="_blank"
          rel="noopener noreferrer"
          icon="i-lucide-external-link"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Open demo in new tab"
        />
      </div>
    </div>

    <div
      class="relative bg-default"
      :class="[aspectClass, { 'h-[calc(100vh-44px)]': isFullscreen }]"
      :style="!isFullscreen && heightStyle ? { height: heightStyle } : undefined"
    >
      <div
        v-if="!loaded"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-2 text-muted">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin"
          />
          <span class="text-xs">Loading demo</span>
        </div>
      </div>
      <iframe
        :src="src"
        :title="title"
        :allow="allow"
        :sandbox="sandbox"
        loading="lazy"
        class="absolute inset-0 w-full h-full border-0"
        :class="{ 'opacity-0': !loaded }"
        @load="loaded = true"
      />
    </div>
  </div>
</template>
