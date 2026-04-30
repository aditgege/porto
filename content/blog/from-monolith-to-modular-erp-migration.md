---
title: "From Monolith to Modular: Rebuilding Our ERP with a Plugin Architecture"
description: How we rebuilt a 200k+ LOC Vue 2 ERP monolith into a modular, extensible architecture using Vue 3, achieving 10x better maintainability and enabling client-specific customizations without forking.
date: 2025-04-30
image: https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
minRead: 15
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
    alt: Aditia Dwi Pratomo
---

After three years of building features on top of our Vue 2 ERP system, we hit a wall. Not a technical wall — the system worked fine. But every new client wanted customizations, and every customization meant forking the codebase or hardcoding client-specific logic into the core. We had tire inventory management for one client, custom tax calculations for another, and industry-specific workflows scattered throughout the codebase.

The breaking point came when a potential client asked: "Can we disable the warehouse module? We're a service company." The answer was technically yes, but it would've required commenting out code in seven different files, breaking the build, and maintaining a permanent fork. That's when we knew we needed a fundamental rethink.

This is the story of how we rebuilt our ERP from a 200k+ line monolith into a modular, plugin-based architecture — and why it was the best technical decision we've made in years.

## The Problem: Monolithic Coupling

Our original system, `nexus-core-frontend`, was a classic Vue 2 monolith. Everything lived in one codebase:

```
src/
├── components/commons/     # 76 shared components
├── pages/                  # All domain pages mixed together
├── repositories/           # 80+ API endpoints in one factory
├── routes/                 # 15 route files manually wired
├── store/                  # Vuex modules for every domain
└── plugins/                # Global helpers on Vue.prototype
```

The architecture had several critical flaws:

**1. No Module Boundaries**

Sales, purchase, warehouse, accounting, HR — all tangled together. A change in the sales module could accidentally break warehouse functionality because they shared components and state. We had no way to test modules in isolation.

**2. Client-Specific Code in Core**

One client needed tire inventory management. Instead of building it as an extension, we added `TireConstructionRepo`, `TireTypeRepo`, `TirePatternRepo` directly into the core codebase. Now every client's bundle included tire management code they'd never use.

**3. Manual Wiring Everywhere**

Adding a new module meant editing 5+ files:
- `routes/index.js` — import and register routes
- `store/index.js` — register Vuex module
- `RepositoryFactory.js` — add API endpoints
- `main.js` — register plugins
- `locales/` — add translations

Miss one step, and the module wouldn't work. No compiler errors, just runtime failures.

**4. Global Prototype Pollution**

We had 10+ global helpers on `Vue.prototype`:

```javascript
Vue.prototype.$helpers
Vue.prototype.$toast
Vue.prototype.$orderCalculation
Vue.prototype.$permissionCheck
// ... 6 more
```

This made testing hard (had to mock the entire Vue instance) and created hidden dependencies. You couldn't tell what a component needed just by reading its imports.

**5. Zero Extensibility**

Clients wanted to add custom fields to forms, inject logic into workflows, or override default behaviors. The only way to do this was to fork the codebase and maintain a permanent divergence. We had three different forks for three different clients.

## The Solution: Plugin Architecture

We designed `nexus-erp` from the ground up as a **modular plugin system**. The core idea: the ERP is not a monolith, it's a **composition of independent modules**.

### Architecture Overview

```
nexus-erp/
├── packages/
│   ├── core/                    # Framework layer
│   │   ├── bootstrap/           # App creation, DI
│   │   ├── extensions/          # Plugin system
│   │   ├── http/                # API clients
│   │   └── router/              # Route registry
│   ├── ui/                      # Shared UI components
│   ├── shared/                  # Utilities
│   ├── module-sales/            # Sales module (independent)
│   ├── module-purchase/         # Purchase module (independent)
│   ├── module-warehouse/        # Warehouse module (independent)
│   ├── module-accounting/       # Accounting module (independent)
│   ├── module-hr/               # HR module (independent)
│   ├── module-contacts/         # Contacts module (independent)
│   └── module-settings/         # Settings module (independent)
└── apps/
    └── nexus-base/              # Main app (composes modules)
```

Each module is a **self-contained package** with its own:
- Pages and components
- API repositories
- Pinia stores
- Routes
- Menu items
- Extension points

### Module Definition

Here's what a module looks like:

```typescript
// packages/module-sales/src/index.ts
import { defineModule } from '@nexus/core'

export const salesModule = defineModule({
  id: 'sales',
  routes: [
    {
      path: '/sales/orders',
      component: () => import('./pages/sales-order/SalesOrderList.vue')
    },
    {
      path: '/sales/orders/:id',
      component: () => import('./pages/sales-order/SalesOrderForm.vue')
    }
  ],
  menu: [
    {
      title: 'Sales',
      icon: 'mdi-cart',
      children: [
        { title: 'Orders', path: '/sales/orders' },
        { title: 'Invoices', path: '/sales/invoices' },
        { title: 'Payments', path: '/sales/payments' }
      ]
    }
  ],
  extensionPoints: [
    'sales.order.form.header.after',
    'sales.order.form.customer.after',
    'sales.order.form.lines.columns',
    'sales.order.submit.before',
    'sales.order.submit.after'
  ],
  components: {
    'sales.order.list': () => import('./pages/sales-order/SalesOrderList.vue'),
    'sales.order.form': () => import('./pages/sales-order/SalesOrderForm.vue')
  }
})
```

### App Composition

The main app is just a **composition of modules**:

```typescript
// apps/nexus-base/src/main.ts
import { createNexusApp } from '@nexus/core'
import { salesModule } from '@nexus/module-sales'
import { purchaseModule } from '@nexus/module-purchase'
import { warehouseModule } from '@nexus/module-warehouse'
import { accountingModule } from '@nexus/module-accounting'

createNexusApp({
  modules: [
    salesModule(),
    purchaseModule(),
    warehouseModule(),
    accountingModule()
  ],
  config: {
    brandName: 'Nexus ERP',
    primaryColor: '#2E7D32'
  }
})
```

Want to disable warehouse? Just remove it from the array. No code changes, no build errors. The module simply doesn't load.

## Key Benefits

### 1. True Modularity

Each module is **independently testable**. You can run the sales module in isolation without loading the entire ERP:

```typescript
// Test setup
import { createNexusApp } from '@nexus/core'
import { salesModule } from '@nexus/module-sales'

const app = createNexusApp({
  modules: [salesModule()]
})
```

This makes testing 10x faster and catches integration issues early.

### 2. Client-Specific Extensions

Remember the tire inventory problem? Now it's an **extension**, not core code:

```typescript
// extensions/maharaja-tires/index.ts
import { defineExtension } from '@nexus/core'

export const maharajaTiresExtension = defineExtension({
  id: 'maharaja-tires',
  
  // Add custom fields to sales order form
  fields: [
    {
      target: 'sales.order.form.lines.columns',
      component: () => import('./components/TirePatternColumn.vue'),
      order: 10
    }
  ],
  
  // Inject validation logic
  hooks: {
    'sales.order.submit.before': async (ctx) => {
      const { order } = ctx
      // Validate tire stock before submitting
      await validateTireStock(order.lines)
    }
  },
  
  // Add tire management pages
  routes: [
    {
      path: '/tires/patterns',
      component: () => import('./pages/TirePatternList.vue')
    }
  ],
  
  // Add to sales menu
  menu: [
    {
      module: 'sales',
      items: [
        { title: 'Tire Patterns', path: '/tires/patterns' }
      ]
    }
  ]
})
```

Now the client's app composes the extension:

```typescript
// Client-specific main.ts
createNexusApp({
  modules: [salesModule(), warehouseModule()],
  extensions: [maharajaTiresExtension()]  // ← Client-specific
})
```

**Zero impact on core code.** Other clients don't even see the tire management code in their bundles.

### 3. Extension Points

Modules declare **extension points** where external code can hook in:

```vue
<!-- In sales order form -->
<template>
  <div>
    <h1>Sales Order</h1>
    
    <!-- Core form fields -->
    <CustomerSelect v-model="order.customer" />
    
    <!-- Extension point: inject custom fields after customer -->
    <ExtensionZone 
      point="sales.order.form.customer.after" 
      :context="{ order }" 
    />
    
    <OrderLinesTable v-model="order.lines" />
    
    <!-- Extension point: add custom columns to table -->
    <ExtensionZone 
      point="sales.order.form.lines.columns" 
      :context="{ order }" 
    />
  </div>
</template>
```

Extensions can inject components, add table columns, run validation, or modify data — all without touching the module's source code.

### 4. Lazy Loading

Every module is **lazy-loaded**:

```typescript
components: {
  'sales.order.list': () => import('./pages/sales-order/SalesOrderList.vue'),
  'sales.order.form': () => import('./pages/sales-order/SalesOrderForm.vue')
}
```

The initial bundle only loads `@nexus/core` + the active route. A user who never visits the accounting module never downloads its code. This cut our initial bundle size by **60%**.

### 5. Dependency Injection

No more global prototype pollution. Everything is injected via composables:

```typescript
// Old way (nexus-core-frontend)
export default {
  methods: {
    async fetchOrders() {
      const response = await this.$api.get('/orders')  // Where does $api come from?
      this.$toast.success('Loaded')  // Where does $toast come from?
    }
  }
}
```

```typescript
// New way (nexus-erp)
<script setup>
import { useHttp } from '@nexus/core'
import { useToast } from '@nexus/core'

const http = useHttp()
const toast = useToast()

const fetchOrders = async () => {
  const response = await http.get('/orders')  // Explicit dependency
  toast.success('Loaded')  // Explicit dependency
}
</script>
```

Dependencies are **explicit**. You can see what a component needs just by reading its imports. Testing is trivial — just mock the composables.

## Migration Strategy

We didn't rewrite everything at once. That would've been suicide. Instead, we migrated **one module at a time** while keeping the old system running.

### Phase 1: Build the Core (2 months)

We started by building `@nexus/core` — the framework layer that all modules would depend on:

- `createNexusApp()` — app bootstrap
- Extension registry — plugin system
- HTTP clients — API layer with auto token refresh
- Router integration — route registry
- Layout system — dashboard shell

This was the riskiest phase because we were building infrastructure with no immediate business value. We had to convince stakeholders that the investment would pay off.

### Phase 2: Migrate One Module (1 month)

We picked **sales** as the first module because it was the most used and had the most client-specific customizations. We:

1. Created `packages/module-sales/`
2. Copied sales pages from old codebase
3. Converted Vue 2 Options API → Vue 3 Composition API
4. Extracted API calls into repositories
5. Defined extension points
6. Wrote module definition

The first module took a month because we were still figuring out patterns. Later modules took 1-2 weeks each.

### Phase 3: Parallel Migration (4 months)

Once we had the pattern down, we parallelized. Three developers each took a module:

- Developer A: Purchase + Warehouse
- Developer B: Accounting + HR
- Developer C: Contacts + Settings

We used **feature flags** to gradually roll out the new modules to production. If a module had issues, we could instantly fall back to the old code.

### Phase 4: Extension Extraction (2 months)

We identified all client-specific code in the old codebase and extracted it into extensions:

- Maharaja tire management → `maharaja-tires` extension
- Custom tax calculations → `custom-tax` extension
- Industry-specific workflows → separate extensions

This was the most satisfying phase because we finally **removed all client-specific code from core**.

### Phase 5: Deprecate Old System (1 month)

Once all modules were migrated and stable in production, we deprecated the old codebase. We kept it around for 3 months as a safety net, then archived it.

**Total migration time: 10 months** (with 3 developers working part-time while maintaining the old system).

## Technical Comparison

| Aspect | nexus-core-frontend (Old) | nexus-erp (New) |
|--------|---------------------------|-----------------|
| **Architecture** | Monolithic | Modular plugin system |
| **Stack** | Vue 2.7 + Vuetify 2 + Vuex 3 | Vue 3.5 + Vuetify 3 + Pinia 3 |
| **Type Safety** | Minimal (props mutation allowed) | TypeScript strict mode |
| **Module Isolation** | None (everything coupled) | Full (independent packages) |
| **Client Customization** | Fork codebase | Extensions (no fork) |
| **Bundle Size** | 2.4 MB initial | 0.9 MB initial (60% reduction) |
| **Test Isolation** | Impossible | Full (test modules independently) |
| **Add New Module** | Edit 5+ files manually | Create package + 1 line in main.ts |
| **Remove Module** | Comment out code in 7 files | Remove 1 line from main.ts |
| **Extension Points** | None | First-class support |
| **Lazy Loading** | Minimal | Everything lazy-loaded |
| **Dependency Injection** | Global prototype pollution | Explicit composables |
| **Security Vulnerabilities** | 49 (11 critical) | 0 |

## Effort Breakdown

Here's the realistic effort for a similar migration:

### Small ERP (50k LOC, 3-5 modules)
- **Core framework**: 1 month (1 senior dev)
- **Module migration**: 2-3 weeks per module (1 dev)
- **Extension extraction**: 2-4 weeks (1 dev)
- **Testing & stabilization**: 1 month (team)
- **Total**: 4-5 months

### Medium ERP (100k LOC, 8-10 modules)
- **Core framework**: 1.5 months (1 senior dev)
- **Module migration**: 2-3 weeks per module (2-3 devs in parallel)
- **Extension extraction**: 1-2 months (1 dev)
- **Testing & stabilization**: 1.5 months (team)
- **Total**: 6-8 months

### Large ERP (200k+ LOC, 15+ modules)
- **Core framework**: 2 months (2 senior devs)
- **Module migration**: 2-4 weeks per module (3-4 devs in parallel)
- **Extension extraction**: 2-3 months (2 devs)
- **Testing & stabilization**: 2 months (team)
- **Total**: 10-12 months

**Critical success factors**:
- Senior developer to design the core framework
- Parallel migration of modules (don't do it sequentially)
- Feature flags for gradual rollout
- Comprehensive E2E test suite
- Stakeholder buy-in (this is a long-term investment)

## Best Practices We Learned

### 1. Design Extension Points Early

Don't wait until clients ask for customizations. Think about where extensions might be needed and declare extension points upfront:

```typescript
extensionPoints: [
  'module.feature.form.header.before',
  'module.feature.form.header.after',
  'module.feature.form.fields.after',
  'module.feature.submit.before',
  'module.feature.submit.after',
  'module.feature.table.columns',
  'module.feature.table.actions'
]
```

It's easier to add extension points during initial development than to retrofit them later.

### 2. Keep Modules Truly Independent

A module should **never import from another module**. If two modules need shared code, put it in `@nexus/shared` or `@nexus/ui`.

```typescript
// ❌ BAD: Module coupling
import { calculateTax } from '@nexus/module-accounting'

// ✅ GOOD: Shared utility
import { calculateTax } from '@nexus/shared'
```

This ensures modules can be loaded/unloaded independently.

### 3. Use Workspace Protocol for Dependencies

In `package.json`, use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@nexus/core": "workspace:*",
    "@nexus/ui": "workspace:*"
  }
}
```

This ensures you're always using the local version during development, and pnpm will resolve it correctly.

### 4. Lazy Load Everything

Every component in a module should be lazy-loaded:

```typescript
components: {
  'sales.order.list': () => import('./pages/sales-order/SalesOrderList.vue')
}
```

Don't use direct imports. This keeps the initial bundle small and allows tree-shaking to work properly.

### 5. Document Extension Points

Create a registry of all extension points with examples:

```typescript
/**
 * Extension Point: sales.order.submit.before
 * 
 * Triggered before a sales order is submitted.
 * Use this to add custom validation or modify the order data.
 * 
 * Context:
 * - order: SalesOrder - The order being submitted
 * - user: User - Current user
 * 
 * Example:
 * hooks: {
 *   'sales.order.submit.before': async (ctx) => {
 *     if (ctx.order.total > 10000) {
 *       throw new Error('Orders over $10k require approval')
 *     }
 *   }
 * }
 */
```

This makes it easy for extension developers to know what's available.

### 6. Version Your Modules

Even though modules are in a monorepo, give them semantic versions:

```json
{
  "name": "@nexus/module-sales",
  "version": "1.2.0"
}
```

This helps track breaking changes and makes it clear when a module's API changes.

## Results After 6 Months

The new architecture has been in production for 6 months. Here's what we've seen:

**Development Speed**: New features take **40% less time** to build. Developers can work on modules independently without stepping on each other's toes.

**Client Onboarding**: We onboarded 3 new clients with custom requirements. Each client got their own extension package. **Zero core code changes** were needed.

**Bundle Size**: Initial load time dropped from 4.2s to 1.6s (60% improvement) due to lazy loading and tree-shaking.

**Bug Rate**: Production bugs dropped by **30%**. Module isolation means bugs are contained — a bug in accounting doesn't break sales.

**Test Coverage**: We went from 15% test coverage to 65%. Testing modules in isolation is so much easier that developers actually write tests now.

**Team Morale**: Developers love the new architecture. No more "I can't touch that file because it might break something else" fear.

## When NOT to Do This

This architecture isn't for everyone. **Don't do this if**:

- Your ERP is small (<20k LOC) — the overhead isn't worth it
- You have no client-specific customizations — a monolith is simpler
- You don't have senior developers who can design the core framework
- You can't afford 6-12 months of migration time
- Your business is unstable — focus on features, not architecture

**Do this if**:

- You have multiple clients with different requirements
- You're constantly forking the codebase for customizations
- Your codebase is becoming unmaintainable
- You want to enable a partner ecosystem (extensions)
- You're planning to scale to 10+ modules

## Conclusion

Migrating from a monolith to a modular plugin architecture was the hardest technical project we've undertaken, but also the most rewarding. We now have an ERP that can adapt to any client's needs without forking, scales to dozens of modules without becoming unmaintainable, and enables a team of developers to work in parallel without conflicts.

The key insight: **an ERP is not a single application, it's a platform**. Once you embrace that mindset, the architecture follows naturally.

If you're building a multi-tenant ERP or SaaS product with client-specific customizations, I highly recommend this approach. The upfront investment is significant, but the long-term payoff is enormous.

The code for our module system is open-source (coming soon). If you're interested in the implementation details, follow me on GitHub or reach out — I'm happy to share what we learned.

---

**Want to discuss ERP architecture?** I'm always happy to chat about modular systems, plugin architectures, and Vue 3 patterns. Find me on Twitter [@aditgege](https://twitter.com/aditgege) or email me at adit@example.com.
