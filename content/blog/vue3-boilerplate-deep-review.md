---
title: "Vue 3 Boilerplate Deep Review: A Feature-Based SPA Starter That Gets It Right"
description: An exhaustive analysis of a modern Vue 3 boilerplate — its architecture, patterns, tradeoffs, real-world study cases, edge cases, and whether you should actually use it for your next project.
date: 2026-06-17
image: https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
minRead: 14
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: /me/gelap.jpg
    alt: Aditia Dwi Pratomo
---

Every developer has a folder called `boilerplate/` somewhere on their machine. It's the folder you clone when starting a new project — the one you've configured just the way you like it, with your preferred folder structure, your favorite state management setup, and your go-to component library. The problem is, most "boilerplates" spiral into a mess of opinions that only make sense to their creator.

Today I'm doing a deep review of a Vue 3 boilerplate called **vue-boilerplate** — a surprisingly thoughtful starter that ships with a feature-based architecture, mock-first development, and a complete customer-management CRUD demo. I'll walk through every architectural decision, highlight the tradeoffs, and give you real study cases for when this boilerplate shines — and when it doesn't.

## What Is This Boilerplate?

At its core, this is a Vue 3 SPA boilerplate built with Vite, TypeScript, Tailwind CSS v4, and shadcn-vue. It organizes code by feature rather than by technical role, ships with a working customer-management example (list, create, update, delete), and runs entirely without a backend — all API calls go through an in-memory mock with simulated network latency.

Here's the full tech stack:

| Layer | Choice |
|-------|--------|
| Framework | Vue 3 with Composition API + `<script setup>` |
| Language | TypeScript 6.0 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| UI Components | shadcn-vue (Reka/Lyra style) |
| State Management | Pinia 3 |
| Server State | Pinia Colada |
| Routing | Vue Router 5 |
| Validation | Zod + `@vee-validate/zod` |
| Utilities | VueUse |
| Icons | Lucide Vue + Hugeicons |
| Package Manager | pnpm |

The key word here is **opinionated but not prescriptive**. Every pattern in this boilerplate has a clear escape hatch, and the mock API is deliberately designed as a swap point for real HTTP calls.

## Architecture Deep Dive

### Feature-Based Organization

This is the boilerplate's strongest architectural decision. Instead of organizing code by technical role (`components/`, `stores/`, `utils/`), it organizes by **feature** — your business domain concepts.

```
src/features/customer/
├── pages/CustomerPage.vue      # Route container: wires composables to UI
├── components/                 # Feature-specific presentational components
│   ├── CustomerTable.vue       # Table with loading / empty / data states
│   ├── CustomerForm.vue        # Create/edit form with Zod validation
│   └── DeleteCustomerDialog.vue
├── composables/                # Feature-specific Vue composables
│   ├── useCustomersQuery.ts    # Pinia Colada query
│   ├── useCustomerMutations.ts # Pinia Colada mutations with cache invalidation
│   └── useCustomerFilter.ts    # Local filter/pagination/sort state
├── api/                        # API adapters (swap point for real HTTP)
│   ├── customer.api.ts         # Thin proxy to mock
│   └── customer.query.ts       # Alternative Pinia Colada wrappers
├── services/                   # Pure business logic
│   └── customer.service.ts     # Formatting, sorting, validation helpers
├── schemas/                    # Zod schemas
│   └── customer.schema.ts      # Runtime validation + type inference
├── types/                      # TypeScript interfaces
│   └── customer.type.ts        # Domain types
└── index.ts                    # Public barrel exports
```

**Why this works**: Adding a new feature like `branch` or `product` means creating a new folder under `features/` with the same structure. Everything related to that feature lives in one place — the page, the API calls, the types, the validation, the tests. When you need to change how branches work, you go to one folder. When you need to onboard a new developer, you point them at one folder and say "this is how we do things."

**The tradeoff**: Feature-based organization can lead to code duplication. If both `customer` and `branch` need a date formatter, you'll either duplicate it or need a `shared/utils/` folder. This boilerplate handles that with `src/lib/utils.ts` for framework-level utilities, but the line between "shared" and "feature-specific" requires discipline.

Compare this to the traditional technical-layered approach:

```
src/
├── pages/CustomerPage.vue
├── pages/BranchPage.vue
├── components/CustomerTable.vue
├── components/BranchTable.vue
├── stores/customer.ts
├── stores/branch.ts
├── api/customer.ts
├── api/branch.ts
```

The technical approach works fine for 2-3 features. But at 10+ features, you're constantly jumping between directories, and the mental model of "what files are involved in changing customers?" gets fragmented.

### The API Adapter Seam

This is a subtle but brilliant architectural pattern. Instead of calling `fetch('/api/customers')` directly from components or composables, every API call goes through a thin adapter:

```typescript
// src/features/customer/api/customer.api.ts
export function getCustomers(params: CustomerListParams): Promise<CustomerListResponse> {
  return mockGetCustomers(params)
}

export function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  return mockCreateCustomer(data)
}

export function updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer> {
  return mockUpdateCustomer(id, data)
}

export function deleteCustomer(id: string): Promise<void> {
  return mockDeleteCustomer(id)
}
```

Each function is a named export — not a generic `request(method, path, body)` wrapper. This is important. It means:

1. **TypeScript knows exactly what each function returns.** `getCustomers` returns `Promise<CustomerListResponse>`, not `Promise<unknown>`.

2. **The swap point is explicit.** To connect to a real backend, you change four lines of code — each function body becomes a `fetch()` call. No refactoring, no interface extraction, no "I need to change how all API calls work."

3. **You can mock at the function level.** Want to test error states? Override `deleteCustomer` to throw. Want to simulate a slow network? Wrap `getCustomers` with a delay. Each function is independently mockable.

This is essentially the **Strategy Pattern Lite** — each API function is a strategy that can be swapped without changing consumers.

Compare this to the common "abstracted API client" approach:

```typescript
// Anti-pattern: over-abstracted API client
const apiClient = createApiClient({ baseURL: '/api', headers: { ... } })
await apiClient.get('/customers', { params })  // What does this return? unknown
await apiClient.post('/customers', { body })    // Generic, hard to mock individually
```

The abstracted client is flexible but opaque. The adapter pattern is rigid but explicit. For a boilerplate that's meant to be understood in 10 minutes, the adapter pattern is the right choice.

### State Management: Pinia + Pinia Colada

This boilerplate makes a deliberate distinction between two kinds of state:

1. **Server state** — data that comes from an API and needs caching, refetching, and cache invalidation. This goes through **Pinia Colada**.

2. **Local UI state** — search inputs, dialog visibility, pagination cursors. This lives in feature composables using Vue's `ref` and `computed`.

Here's the query composable:

```typescript
// src/features/customer/composables/useCustomersQuery.ts
export function useCustomersQuery(params: MaybeRefOrGetter<CustomerListParams>) {
  return useQuery<CustomerListResponse, Error>({
    key: () => ['customers', toValue(params)],
    query: () => getCustomers(toValue(params)),
  })
}
```

And the mutations:

```typescript
// src/features/customer/composables/useCustomerMutations.ts
export function useCustomerMutations() {
  const queryCache = useQueryCache()

  const create = useMutation<Customer, CreateCustomerInput>({
    mutation: input => createCustomer(input),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['customers'] })
    },
  })

  const update = useMutation<Customer, { id: string, input: UpdateCustomerInput }>({
    mutation: ({ id, input }) => updateCustomer(id, input),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['customers'] })
    },
  })

  const remove = useMutation<void, string>({
    mutation: id => deleteCustomer(id),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['customers'] })
    },
  })

  return { create, update, remove }
}
```

**The good**: Cache invalidation is automatic. After creating, updating, or deleting a customer, all active `['customers']` queries automatically refetch. You don't need to manually call `refetch()` or update the store.

**The tradeoff**: Invalidation is broad. It invalidates **all** customer queries regardless of their params. If you're on page 3 with a search filter and you create a new customer, the entire list refetches with those same params. For a small dataset this is fine. For a production app with 10,000+ customers, you'd want targeted cache updates or optimistic mutations.

The local UI state lives separately in `useCustomerFilter`:

```typescript
export function useCustomerFilter() {
  const search = ref('')
  const page = ref(1)
  const pageSize = ref(10)

  const params = computed<CustomerListParams>(() => ({
    search: search.value || undefined,
    page: page.value,
    pageSize: pageSize.value,
  }))

  function setSearch(value: string) {
    search.value = value
    page.value = 1  // Reset to page 1 on new search
  }

  // ... pagination helpers
}
```

Notice that `setSearch` resets the page to 1. This is the kind of detail that's easy to forget when binding props directly. By encapsulating filter logic in a composable, the boilerplate prevents the classic bug where you search for something, land on page 3, then don't see results because you're still on page 3 but there's only 1 page of results.

### Validation: Zod as Source of Truth

The boilerplate uses Zod for both runtime validation and TypeScript type inference:

```typescript
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
})

export const UpdateCustomerSchema = CreateCustomerSchema.partial()

// Types inferred from schemas
export type Customer = z.infer<typeof CustomerSchema>
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>
```

The form component validates using `CreateCustomerSchema.safeParse()`:

```typescript
function validate(): boolean {
  clearErrors()
  const result = CreateCustomerSchema.safeParse(form)

  if (result.success) return true

  for (const issue of result.error.issues) {
    const path = issue.path[0] as keyof FormState
    if (errors[path] === '') {
      errors[path] = issue.message
    }
  }
  return false
}
```

**Notable**: `@vee-validate/zod` is installed but **not used**. The form implements validation manually with `safeParse`. This is a deliberate choice — manual validation gives you full control over when validation runs (on blur, on input after first submit attempt) without the abstraction layer of a form library. The dependency is there so you can swap to declarative validation if you prefer.

**The duplication**: Types exist twice — once as explicit TypeScript interfaces in `customer.type.ts`, and once as Zod-inferred types in `customer.schema.ts`. The barrel export (`index.ts`) exports from both, meaning consumers can import from either source. This is a "choose your preference" approach, but it means maintaining two type definitions. In production, you'd pick one source of truth.

### The Mock API: Brilliant or Dangerous?

The mock API in `src/mock/customers.ts` deserves special attention. It's an in-memory data store with:

- **20 seed customers** (Indonesian names like Ahmad Fauzi, Budi Santoso — a nice local touch)
- **Simulated network latency** (200-500ms random delay via `setTimeout`)
- **Full CRUD** with search, pagination, and error handling
- **Auto-incrementing IDs** (`cust_001`, `cust_002`, etc.)

```typescript
export async function mockGetCustomers(params: CustomerListParams): Promise<CustomerListResponse> {
  await randomDelay()

  const search = params.search?.toLowerCase() ?? ''
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? 10)

  let data = [...customers]

  if (search) {
    data = data.filter(customer =>
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search),
    )
  }

  const total = data.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  data = data.slice(start, start + pageSize)

  return { data, total, totalPages }
}
```

**The benefits**: You can develop the entire frontend without a backend. No Docker, no database setup, no API server. Clone and `pnpm dev` — you have a working app. This is ideal for prototyping, UI development, and frontend-only teams.

**The blind spots**:

1. **No HTTP error codes.** The mock throws `new Error('Customer not found')`, but real APIs return structured errors like `{ status: 404, code: 'NOT_FOUND' }`. Your error handling won't be tested.

2. **No network failures.** The mock never fails due to connectivity issues. Real apps need retry logic, offline queues, and timeout handling.

3. **No race conditions.** The mock processes requests sequentially (it's single-threaded JS). Real apps deal with concurrent mutations, stale data, and optimistic concurrency control.

4. **No authentication.** There's no auth layer to mock token refresh, 401 handling, or permission checks.

5. **No request cancellation.** Real apps need to abort in-flight requests when components unmount or users navigate away.

These aren't bugs — they're intentional simplifications for a boilerplate. But they become critical gaps when you connect to a real backend. The boilerplate doesn't model them because it expects you to handle them when you swap in real HTTP calls.

### Component Patterns: Loading, Empty, Error, and Data States

Every data-displaying component in this boilerplate handles four states. Here's the full rendering logic from `CustomerTable.vue`:

```vue
<template>
  <Table>
    <TableBody>
      <!-- State 1: Loading - skeleton rows with animate-pulse -->
      <template v-if="props.loading">
        <TableRow v-for="n in SKELETON_ROWS" :key="`skeleton-${n}`">
          <TableCell v-for="col in 6" :key="col">
            <div class="h-4 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      </template>

      <!-- State 2: Empty - friendly message when no results -->
      <template v-else-if="props.rows.length === 0">
        <TableEmpty :colspan="6">
          <div class="flex flex-col items-center gap-2 text-muted-foreground">
            <span class="text-sm">No customers found.</span>
          </div>
        </TableEmpty>
      </template>

      <!-- State 3 & 4: Data - actual rows -->
      <template v-else>
        <TableRow v-for="(customer, index) in props.rows" :key="customer.id">
          <!-- ... -->
        </TableRow>
      </template>
    </TableBody>
  </Table>
</template>
```

Plus an error banner in the parent page:

```vue
<div v-if="queryError" class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
  Failed to load customers. Please try again.
</div>
```

This is the "optimistic skeleton, pessimistic error" pattern. Loading states use skeleton placeholders (optimistic — the UI doesn't jerk around). Error states use explicit banners (pessimistic — don't pretend everything's fine when it's not).

**What's missing**: Mutation error handling. If `create.mutateAsync()` fails (network error, validation error from server), the form stays open but there's no error toast. The `vue-sonner` toast library is in `package.json` but isn't wired up for mutation errors. In production, you'd want to show "Failed to create customer. Please try again." via a toast.

## The Complete Data Flow

Putting it all together, here's how a user creating a customer flows through the entire architecture:

```
1. User clicks "Add Customer"
   ↓
2. CustomerPage.vue: showCreateDialog = true
   ↓
3. CustomerForm.vue renders in a Dialog with empty form state
   ↓
4. User types name, email, phone
   ↓
5. onBlur / onInput triggers validate()
   ↓
6. CreateCustomerSchema.safeParse(form) validates
   ↓
7. User clicks "Save"
   ↓
8. handleSubmit() emits 'submit' with { name, email, phone }
   ↓
9. CustomerPage.vue handleSubmitCreate(data) calls create.mutateAsync(data)
   ↓
10. useCustomerMutations → createCustomer(input) → mockCreateCustomer(data)
   ↓
11. Mock adds to in-memory array, returns new Customer with generated ID
   ↓
12. onSuccess: queryCache.invalidateQueries({ key: ['customers'] })
   ↓
13. All active useCustomersQuery instances auto-refetch
   ↓
14. CustomerTable re-renders with updated data (includes new customer)
   ↓
15. Dialog closes, user sees new customer in the table
```

Every layer has a single responsibility:
- **Component**: Renders UI, handles user events
- **Composable**: Manages async state, cache keys, refetch logic
- **API Adapter**: Translates between composable and backend
- **Mock**: Simulates backend behavior
- **Schema**: Validates data shape
- **Service**: Pure business logic (formatting, sorting)

## Study Cases: When This Boilerplate Shines

### Case 1: The Internal Admin Dashboard

You're building an internal tool for your team — a customer management dashboard, an inventory tracker, or a content management system. You need something up and running in a week, and the backend team won't have their API ready for another month.

**Why this boilerplate works**: The mock API lets you build the entire frontend before the backend exists. Your API adapter functions (`getCustomers`, `createCustomer`) define the contract. When the backend is ready, you swap four function bodies from mock calls to `fetch()` calls. The UI, validation, and business logic don't change.

**Concrete scenario**: The mock has 20 seed customers with realistic data. You can demo the full CRUD flow to stakeholders on day 1. By day 5, you've built three more features (branches, products, orders) using the same feature pattern. When the backend ships, you connect and it just works — because the contract (types, schemas, function signatures) was established from the start.

### Case 2: The Portfolio Project

You're a freelance developer showcasing your Vue skills. You need a project that demonstrates you understand production patterns: feature-based architecture, TypeScript, state management, validation, component composition, and testing.

**Why this boilerplate works**: It's a complete, working app with patterns that hiring managers recognize. The `CustomerTable.vue` handles four states (loading, empty, data, error). The `CustomerForm.vue` implements proper touch-based validation. The service layer has unit tests. It's not a todo app — it's a real CRUD dashboard with pagination, search, and state management.

### Case 3: The Startup MVP

You're a two-person team building an MVP. You need to validate the idea before investing in backend infrastructure. You need something that works well enough to show users but can evolve into production code.

**Why this boilerplate works**: It's not a throwaway prototype. The architecture is production-ready. When you're ready to add a real backend, the transition is mechanical (swap mock functions for fetch calls). The feature-based organization means you can add features without restructuring the codebase.

### Case 4: The Learning Project

You're learning Vue 3 and want to understand how real applications are structured. Most tutorials show you how to build a component, but not how to organize a codebase that will grow to 20+ features.

**Why this boilerplate works**: It demonstrates patterns that aren't obvious from the Vue docs: feature-based organization, the API adapter pattern, cache invalidation with Pinia Colada, and clean separation of server state vs. UI state. The code is small enough to read in an hour but sophisticated enough to learn from.

## Edge Cases: Where This Boilerplate Shows Its Limits

### Edge Case 1: Real-Time Collaboration

If your app requires real-time updates (multiple users editing the same data simultaneously), this boilerplate won't help. Pinia Colada's cache invalidation is request-response based — it refetches after mutations, but it doesn't handle server-pushed updates via WebSockets or Server-Sent Events.

**What you'd need to add**: A WebSocket layer that listens for changes from other users and invalidates/updates the relevant Pinia Colada query caches. You'd also need optimistic concurrency control (ETags, version fields) to prevent conflicting edits.

### Edge Case 2: Offline-First Applications

The mock API simulates network latency, but it doesn't simulate network failure. For an offline-first app (like a field service tool where workers have unreliable connectivity), you'd need:
- Service Workers for caching assets
- IndexedDB for persisting data locally
- A sync queue for pending mutations
- Conflict resolution strategies

The boilerplate gives you none of this out of the box.

### Edge Case 3: Server-Side Rendering (SSR)

This is a pure SPA. There's no server-side rendering, no static site generation, no hydration. If you need SSR (for SEO, initial load performance, or social media previews), you'd need to migrate to Nuxt 3 or implement SSR manually with Vite.

The good news: the feature-based architecture and API adapter pattern would transfer to Nuxt fairly cleanly. The Pinia Colada queries would work with Nuxt's SSR data fetching. But it's not zero-effort.

### Edge Case 4: Large Datasets

The mock API returns all matching results and paginates in memory. With 20 seed customers, this is instant. With 100,000 customers, the mock would work fine (array operations are fast) but the **pattern** wouldn't translate. Real backends need server-side search (database indexes, full-text search), server-side pagination (cursors or offset/limit at the database level), and caching layers.

The boilerplate's pagination (`page`, `pageSize`, `total`, `totalPages`) is modeled correctly for server-side pagination — you'd just replace the in-memory `slice()` with a real query. But you'd also need to add ordering, filtering by multiple fields, and a cursor-based API for deeply paginated lists.

### Edge Case 5: Multi-Tenant Applications

The boilerplate has no concept of tenant isolation. There's no auth layer, no tenant context, no scoped queries. If you're building a SaaS app where each customer's data is isolated, you'd need to add:
- Authentication and session management
- Tenant ID propagation through every API call
- Scoped cache keys (e.g., `['customers', { tenantId }]` instead of just `['customers']`)
- Tenant-aware form validation (e.g., different phone number formats per country)

The feature-based architecture would help — you could add a `tenant/` feature with its own API, types, and composables. But you'd still need to thread tenant context through every existing feature.

## Pros and Cons

### What It Gets Right

- **Zero-backend development**: Run `pnpm dev` and you have a fully working CRUD app. No Docker, no database, no API server. This is the boilerplate's killer feature.

- **Feature-based architecture**: The `features/customer/` pattern is genuinely production-grade. Adding features is mechanical, not architectural.

- **API adapter seam**: The thin proxy functions in `customer.api.ts` create a clean boundary between frontend and backend. Swapping from mock to real is a few lines of code.

- **Four-state rendering**: Every component handles loading, empty, error, and data states. This is what separates prototypes from production code.

- **TypeScript everywhere**: Types are inferred from Zod schemas, composables are fully typed, and component props use `defineProps<Props>()`. No `any` in sight.

- **Separation of server state and UI state**: Pinia Colada handles server data; `ref` and `computed` handle local UI state. Never the twain shall meet.

- **Service layer with tests**: Pure business logic functions with Vitest unit tests. This is the "right" way to test — test the logic, not the framework.

- **Tailwind CSS v4**: Uses the new CSS-first configuration model (`@theme inline`, `@import "tailwindcss"`). No `tailwind.config.js` file needed.

- **Deliberate simplicity**: No over-engineering. The Router has one route. The mock has four functions. The API adapter has four functions. You can read the entire codebase in an hour.

### What It's Missing

- **No mutation error handling**: If a create/update/delete mutation fails, there's no user-facing error (no toast, no inline error). The form just stays open.

- **No auth**: This is a frontend boilerplate, but most real apps need auth. There's no token management, no login flow, no route guards, no 401 handler.

- **No optimistic updates**: Mutations wait for the server response before updating the UI. For a snappy UX, you'd want to update the UI immediately and roll back on error.

- **No request cancellation**: If you navigate away while a query is in-flight, the request isn't aborted. Pinia Colada can handle this, but the boilerplate doesn't demonstrate it.

- **No environment configuration**: There's no `.env.example` or `import.meta.env` usage. Real apps need API base URLs, feature flags, and environment-specific config.

- **No i18n**: The UI is hardcoded in English. Real apps serving multiple locales need `vue-i18n` or similar.

- **No accessibility beyond basics**: The form has `aria-invalid` attributes, but there's no focus management on error, no screen reader announcements for state changes, and no keyboard navigation patterns beyond the defaults.

- **No E2E tests**: The service layer has unit tests, but there are no Playwright or Cypress tests for the full user flows.

- **No CI/CD**: No GitHub Actions, no Dockerfile, no deployment config.

- **No dark mode toggle**: The CSS variables define both light and dark mode tokens, but there's no toggle in the UI.

## The "What If" Matrix

### What If You Use This Boilerplate?

| Scenario | Outcome |
|----------|---------|
| You're building an admin dashboard | **Win.** The CRUD patterns, table with pagination, and form validation are exactly what you need. Swap the mock for your real API and you're 80% done. |
| You're building a public-facing SPA | **Caution.** You'll need to add SSR (or at least prerendering) for SEO and social sharing. The boilerplate is SPA-only. |
| You're building a real-time app | **Mismatch.** The request-response model doesn't fit WebSocket-based updates. You'd need to restructure the data layer. |
| You're learning Vue 3 | **Excellent.** It demonstrates patterns you won't find in tutorials — feature organization, cache invalidation, and state separation. |
| Your team is 5+ developers | **Good start.** The feature-based architecture scales well for teams, but you'll need to add conventions for cross-feature code sharing. |
| You need to ship in 2 weeks with no backend | **Ideal.** The mock API lets you build and demo a complete UI before the backend exists. |

### What If You Don't Use This Boilerplate?

| Alternative | When You'd Choose It |
|-------------|---------------------|
| **Nuxt 3** | You need SSR, static generation, file-based routing, or server routes. The boilerplate's architecture transfers to Nuxt, but Nuxt gives you more out of the box. |
| **Vite + Vue 3 from scratch** | You want full control over every architectural decision. The boilerplate makes decisions for you (Pinia Colada, shadcn-vue, feature-based organization). If you disagree with those choices, scratch is better. |
| **Create Vue** (official Vue scaffolding) | You want a minimal starting point without opinions. Create Vue gives you a bare Vue + Vite project. You add everything else yourself. |
| **Vue Enterprise Boilerplate** | You're building a large-scale enterprise app and need opinionated conventions for 20+ developers. The vue-boilerplate is too minimal for this. |
| **Laravel + Inertia + Vue** | Your backend is Laravel and you want tight frontend-backend integration. Inertia eliminates the need for a separate API layer. |
| **React + shadcn/ui** | You prefer React over Vue. The shadcn patterns transfer, but the entire framework does not. |

## Migration Path: From Mock to Production

The most common question about this boilerplate: "How do I actually connect it to a real backend?" Here's the step-by-step migration:

### Step 1: Add Environment Configuration

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Step 2: Replace Mock Functions with HTTP Calls

```typescript
// src/features/customer/api/customer.api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function getCustomers(params: CustomerListParams): Promise<CustomerListResponse> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const response = await fetch(`${BASE_URL}/customers?${query}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export async function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  const response = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// ... update and delete follow the same pattern
```

### Step 3: Add Structured Error Handling

```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// In the API adapter:
if (!response.ok) {
  const body = await response.json()
  throw new ApiError(response.status, body.code, body.message)
}
```

### Step 4: Add Auth Headers

```typescript
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// In every fetch call:
headers: { 'Content-Type': 'application/json', ...authHeaders() }
```

### Step 5: Handle Mutation Errors in the UI

```typescript
async function handleSubmitCreate(data: CreateCustomerInput) {
  try {
    await create.mutateAsync(data)
    closeFormDialog()
    toast.success('Customer created successfully')
  } catch (error) {
    if (error instanceof ApiError) {
      toast.error(error.message)
    } else {
      toast.error('Failed to create customer. Please try again.')
    }
  }
}
```

### Step 6: Add Request Cancellation

```typescript
// useCustomersQuery.ts
export function useCustomersQuery(params: MaybeRefOrGetter<CustomerListParams>) {
  const controller = new AbortController()

  onUnmounted(() => {
    controller.abort()
  })

  return useQuery<CustomerListResponse, Error>({
    key: () => ['customers', toValue(params)],
    query: ({ signal }) => getCustomers(toValue(params), signal),
  })
}
```

The key insight: the **architecture doesn't change**. The feature-based organization, the component patterns, the validation — everything stays the same. Only the API adapter and error handling layers get deeper.

## Verdict

This boilerplate is not trying to be everything to everyone. It's a **focused, opinionated Vue 3 SPA starter** optimized for a specific workflow: build the frontend first with a mock API, then swap to a real backend later. For this workflow, it excels.

The architectural decisions are defensible: feature-based organization for scalability, Pinia Colada for server state, Zod for validation, and shadcn-vue for accessible UI components. The mock API and API adapter pattern create a clean seam between frontend and backend that makes the transition to production mechanical rather than architectural.

The gaps are intentional: no auth, no SSR, no optimistic updates, no i18n, no CI/CD. These aren't oversights — they're things the boilerplate expects you to add based on your specific needs.

**Use it if**: You're building a Vue 3 SPA, you want feature-based architecture out of the box, you need to develop the frontend before the backend exists, and you're comfortable adding auth, error handling, and deployment config yourself.

**Skip it if**: You need SSR (use Nuxt), you want zero opinions (use Create Vue), you're building a real-time app (use something with WebSocket primitives), or you prefer React (use a React boilerplate).

For its target audience — Vue developers building admin dashboards, internal tools, or SPAs that will eventually connect to a backend — this is one of the better thought-out boilerplates I've seen. It knows what it is, and it doesn't try to be more.
