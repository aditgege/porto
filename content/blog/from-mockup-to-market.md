---
title: "Migrating a Massive Vue 2 ERP to Composition API — Without Breaking Production"
description: How we migrated a 200k+ LOC Vue 2 ERP system to Composition API using the Vue 2.7 bridge, while keeping the app running in production for 50+ tenants.
date: 2025-04-10
image: https://images.pexels.com/photos/1050312/pexels-photo-1050312.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
minRead: 8
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
    alt: Aditia Dwi Pratomo
---

Last year, I faced one of the most challenging migrations of my career: taking a massive multi-tenant ERP system built on Vue 2 Options API and migrating it to Composition API, all while keeping production running for 50+ active tenants. No downtime. No breaking changes. Just a gradual, surgical migration that took six months.

The codebase was huge. Over 200,000 lines of Vue code, hundreds of components, Vuex modules everywhere, and a complex permission system that touched nearly every view. The business couldn't afford a rewrite, and we couldn't freeze feature development for half a year. We needed a strategy that let us migrate incrementally.

## Why Migrate at All?

The Options API wasn't broken, but we were hitting real pain points. Our components were getting bloated with mixins stacked on mixins. Logic reuse was a mess. We had a `permissionMixin`, a `formValidationMixin`, a `tablePaginationMixin`, and they all stepped on each other's toes. Debugging was a nightmare because you'd have to trace through five different files to understand what a single component was doing.

Composition API promised better code organization and reusability through composables. More importantly, it was the future of Vue, and we needed to position ourselves for an eventual Vue 3 migration down the road.

## The Vue 2.7 Bridge

Vue 2.7 was our lifeline. It backported Composition API support to Vue 2, which meant we could start using `<script setup>` and composables without upgrading to Vue 3. This was critical because Vue 3 would've required us to also upgrade Vuetify (we were on v1.5), rewrite our Vuex store, and deal with breaking changes across the entire ecosystem.

The migration plan was simple in theory:

1. Upgrade to Vue 2.7
2. Migrate components one by one to Composition API
3. Extract shared logic into composables
4. Keep everything working in production

In practice, it was way more complicated.

## Phase 1: The Upgrade

Upgrading from Vue 2.6 to 2.7 should've been straightforward, but we hit issues immediately. Some of our dependencies weren't compatible with 2.7 yet. We had to fork a couple of internal libraries and patch them ourselves.

```bash
# Our package.json changes
"vue": "^2.7.14",
"@vue/composition-api": "^1.7.1", # Still needed for some plugins
"vue-template-compiler": "^2.7.14"
```

The build broke in about 20 places. Most were minor, like render function changes, but a few were subtle. We had some dynamic component registration that relied on Vue 2.6 internals, and that needed a complete rewrite.

Testing was brutal. We spent two weeks just running through every module in our staging environment, checking that nothing broke. Our E2E test suite (Playwright) caught a bunch of edge cases, but manual testing was unavoidable given the complexity.

## Phase 2: Composable Extraction

Once we were stable on 2.7, I started identifying patterns that could become composables. The first target was our permission system. Every component was doing this:

```javascript
// Old Options API approach
export default {
  mixins: [permissionMixin],
  computed: {
    canEdit() {
      return this.hasPermission('inventory.edit')
    },
    canDelete() {
      return this.hasPermission('inventory.delete')
    }
  }
}
```

I extracted it into a composable:

```javascript
// composables/usePermissions.js
import { computed } from 'vue'
import { useStore } from 'vuex'

export function usePermissions() {
  const store = useStore()
  
  const hasPermission = (permission) => {
    const userPermissions = store.state.auth.permissions
    return userPermissions.includes(permission)
  }
  
  const hasAnyPermission = (permissions) => {
    return permissions.some(p => hasPermission(p))
  }
  
  const hasAllPermissions = (permissions) => {
    return permissions.every(p => hasPermission(p))
  }
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }
}
```

Now components could just do:

```vue
<script setup>
import { usePermissions } from '@/composables/usePermissions'

const { hasPermission } = usePermissions()
const canEdit = computed(() => hasPermission('inventory.edit'))
</script>
```

Way cleaner. We did the same for form validation, table pagination, API calls, and modal management. By the end, we had about 30 composables that covered 80% of our common patterns.

## Phase 3: Component Migration

Migrating individual components was tedious but methodical. I created a checklist:

1. Convert `data()` to `ref()` or `reactive()`
2. Convert `computed` properties to `computed()`
3. Convert `methods` to regular functions
4. Replace lifecycle hooks (`mounted` → `onMounted`)
5. Extract any mixin logic to composables
6. Update Vuex usage to `useStore()`
7. Test thoroughly

Here's a before/after of a typical component:

```vue
<!-- Before: Options API -->
<script>
export default {
  data() {
    return {
      items: [],
      loading: false,
      page: 1,
      pageSize: 20
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.items.length / this.pageSize)
    }
  },
  mounted() {
    this.fetchItems()
  },
  methods: {
    async fetchItems() {
      this.loading = true
      try {
        const response = await this.$api.get('/items', {
          params: { page: this.page, pageSize: this.pageSize }
        })
        this.items = response.data
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
```

```vue
<!-- After: Composition API -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const { get } = useApi()

const items = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)

const totalPages = computed(() => 
  Math.ceil(items.value.length / pageSize.value)
)

const fetchItems = async () => {
  loading.value = true
  try {
    const response = await get('/items', {
      params: { page: page.value, pageSize: pageSize.value }
    })
    items.value = response.data
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchItems()
})
</script>
```

The Composition API version is actually longer in this case, but the logic is more explicit and easier to follow. More importantly, if we needed pagination elsewhere, we could extract `usePagination()` and reuse it.

## The Gotchas

We hit several issues that weren't obvious from the docs:

**Reactivity Loss**: We had code that destructured reactive objects and lost reactivity. This was a common mistake:

```javascript
// Wrong - loses reactivity
const { name, email } = reactive(user)

// Right - keeps reactivity
const user = reactive({ name: '', email: '' })
// Access as user.name, user.email
```

**Vuex Integration**: Using Vuex with Composition API was awkward. We couldn't use `mapState` or `mapGetters` anymore. We ended up creating a `useStore()` wrapper that made it less painful, but it was still verbose. This is one reason we're planning to migrate to Pinia eventually.

**TypeScript Inference**: We weren't using TypeScript yet (that's another migration), but I noticed that Composition API would've given us much better type inference. That's a future win.

**Testing Changes**: Our unit tests (Vitest) needed updates. We had to mock composables differently than we mocked mixins. Not hard, just different.

## Results

Six months later, we've migrated about 70% of the codebase. The remaining 30% are older, less-touched modules that we'll get to eventually. The impact has been significant:

- New features are faster to build. Composables make logic reuse trivial.
- Onboarding new developers is easier. Composition API is more intuitive for people coming from React or modern frameworks.
- Code reviews are cleaner. Less "where is this method defined?" confusion.
- Bundle size actually went down slightly because we eliminated some mixin overhead.

The migration is still ongoing, but we're in a good place. Production has been stable throughout, which was the whole point. We proved you can modernize a large legacy codebase without a risky big-bang rewrite.

## Lessons Learned

If you're considering a similar migration, here's my advice:

**Start with composables**: Extract shared logic into composables before you start migrating components. This gives you immediate value and makes the component migration easier.

**Migrate by feature, not by file**: Don't just pick random components. Migrate entire features or modules so you can see the benefits in context.

**Write migration guides**: Document your patterns and decisions. We created an internal wiki with examples of how to migrate common patterns. This made it easier for the whole team to contribute.

**Use feature flags**: We used feature flags to gradually roll out migrated modules to production. If something broke, we could roll back instantly.

**Don't rush**: We set a realistic timeline and stuck to it. Trying to rush would've introduced bugs and burned out the team.

The Vue 2.7 bridge bought us time to modernize without the risk of a Vue 3 upgrade. When we do eventually move to Vue 3, the migration will be much smoother because most of our code is already using Composition API. That's the real win.
