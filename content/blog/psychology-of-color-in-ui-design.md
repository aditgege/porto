---
title: "Micro-Frontends with Single-SPA: Lessons from Integrating Multiple Vue Apps"
description: Real-world experience building a micro-frontend architecture with Single-SPA, integrating Vue 2, Vue 3, and React apps into a unified platform.
date: 2025-02-15
image: https://images.pexels.com/photos/40799/paper-colorful-color-loose-40799.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
minRead: 5
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
    alt: Aditia Dwi Pratomo
---

Micro-frontends sound great in theory: independent teams, independent deployments, technology flexibility. In practice, they're messy. I spent the last year integrating three separate applications (two Vue apps and one React app) into a single platform using Single-SPA, and I want to share what actually worked and what was a pain.

## The Problem

We had an ERP system built in Vue 2, a new analytics dashboard in Vue 3, and a third-party CRM widget in React. The business wanted them all accessible from a single interface with seamless navigation. Users shouldn't know they're jumping between different apps.

The naive approach would be iframes, but that comes with serious limitations: no shared state, awkward routing, poor performance, and a terrible user experience. We needed something better.

## Why Single-SPA?

Single-SPA is a JavaScript framework for micro-frontends. It lets you mount and unmount different applications dynamically based on routes, and it handles the orchestration. You can mix frameworks (Vue, React, Angular, whatever) in the same page.

I chose Single-SPA over alternatives like Module Federation because it's framework-agnostic and has good community support. Module Federation is powerful but felt like overkill for our use case, and it's tightly coupled to Webpack 5.

## The Root Config

Single-SPA has a "root config" that acts as the orchestrator. It defines which apps load at which routes and handles shared dependencies.

```javascript
// root-config.js
import { registerApplication, start } from 'single-spa'

// Register the Vue 2 ERP app
registerApplication({
  name: '@company/erp',
  app: () => System.import('@company/erp'),
  activeWhen: ['/erp']
})

// Register the Vue 3 analytics app
registerApplication({
  name: '@company/analytics',
  app: () => System.import('@company/analytics'),
  activeWhen: ['/analytics']
})

// Register the React CRM widget
registerApplication({
  name: '@company/crm',
  app: () => System.import('@company/crm'),
  activeWhen: ['/crm']
})

// Register a shared navigation component (Vue 3)
registerApplication({
  name: '@company/navbar',
  app: () => System.import('@company/navbar'),
  activeWhen: () => true // Always active
})

start()
```

The `activeWhen` function determines when each app is mounted. When the route matches, Single-SPA loads the app, mounts it, and unmounts it when you navigate away.

## Converting Apps to Single-SPA

Each app needed to be converted to a Single-SPA "parcel." This meant exporting lifecycle functions (`bootstrap`, `mount`, `unmount`) that Single-SPA could call.

For Vue apps, there's a helper library called `single-spa-vue`:

```javascript
// Vue 2 ERP app entry point
import Vue from 'vue'
import singleSpaVue from 'single-spa-vue'
import App from './App.vue'
import router from './router'
import store from './store'

const vueLifecycles = singleSpaVue({
  Vue,
  appOptions: {
    render: (h) => h(App),
    router,
    store
  }
})

export const bootstrap = vueLifecycles.bootstrap
export const mount = vueLifecycles.mount
export const unmount = vueLifecycles.unmount
```

The Vue 3 app was similar but used `createApp`:

```javascript
// Vue 3 analytics app entry point
import { createApp } from 'vue'
import singleSpaVue from 'single-spa-vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render: () => h(App)
  },
  handleInstance: (app) => {
    app.use(router)
    app.use(createPinia())
  }
})

export const bootstrap = vueLifecycles.bootstrap
export const mount = vueLifecycles.mount
export const unmount = vueLifecycles.unmount
```

The React app used `single-spa-react`:

```javascript
// React CRM widget entry point
import React from 'react'
import ReactDOM from 'react-dom'
import singleSpaReact from 'single-spa-react'
import App from './App'

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err, info, props) {
    return <div>Error loading CRM widget</div>
  }
})

export const bootstrap = lifecycles.bootstrap
export const mount = lifecycles.mount
export const unmount = lifecycles.unmount
```

## Shared Dependencies

One of the biggest challenges was managing shared dependencies. You don't want to load Vue three times or bundle React separately in every app. Single-SPA uses import maps to share dependencies across apps.

```html
<!-- index.html -->
<script type="systemjs-importmap">
{
  "imports": {
    "vue": "https://cdn.jsdelivr.net/npm/vue@2.7.14/dist/vue.js",
    "vue3": "https://cdn.jsdelivr.net/npm/vue@3.3.4/dist/vue.global.js",
    "react": "https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js",
    "react-dom": "https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js",
    "@company/erp": "https://cdn.company.com/erp/main.js",
    "@company/analytics": "https://cdn.company.com/analytics/main.js",
    "@company/crm": "https://cdn.company.com/crm/main.js",
    "@company/navbar": "https://cdn.company.com/navbar/main.js"
  }
}
</script>
<script src="https://cdn.jsdelivr.net/npm/systemjs@6.14.1/dist/system.js"></script>
<script src="https://cdn.jsdelivr.net/npm/systemjs@6.14.1/dist/extras/amd.js"></script>
```

This worked, but managing import maps manually was tedious. We eventually automated it with a script that generated the import map from our package.json files.

## Routing

Routing was tricky because each app had its own router. We needed to coordinate them so that navigating in one app wouldn't break the others.

Single-SPA recommends using `single-spa-router`, but we found it easier to just use each framework's native router and configure them carefully:

```javascript
// Vue 2 ERP router
const router = new VueRouter({
  mode: 'history',
  base: '/erp',
  routes: [
    { path: '/', component: Dashboard },
    { path: '/inventory', component: Inventory },
    { path: '/orders', component: Orders }
  ]
})
```

The key is setting the `base` path to match the `activeWhen` route in Single-SPA. This way, the ERP app only handles routes under `/erp`, and the analytics app handles routes under `/analytics`.

## Shared State

The hardest problem was shared state. How do you share authentication state, user info, or notifications across apps built with different frameworks?

We used a simple event bus pattern with `CustomEvent`:

```javascript
// shared/events.js
export const AUTH_CHANGED = 'auth:changed'
export const USER_UPDATED = 'user:updated'

export function emitAuthChanged(user) {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED, { detail: user }))
}

export function onAuthChanged(callback) {
  window.addEventListener(AUTH_CHANGED, (event) => {
    callback(event.detail)
  })
}
```

Each app would listen for these events and update its own state:

```javascript
// In Vue 2 ERP app
import { onAuthChanged } from '@company/shared-events'

export default {
  mounted() {
    onAuthChanged((user) => {
      this.$store.commit('setUser', user)
    })
  }
}
```

This worked but felt fragile. For more complex state, we'd probably use a shared store (like Zustand or a simple Pinia store exposed globally), but the event bus was good enough for our needs.

## Styling Conflicts

CSS conflicts were a nightmare. Each app had its own styles, and they'd bleed into each other. We tried a few approaches:

**CSS Modules**: Helped but didn't solve everything. Global styles still conflicted.

**Scoped styles**: Vue's scoped styles worked well within each app, but shared components (like the navbar) still had issues.

**CSS-in-JS**: The React app used styled-components, which isolated its styles nicely.

**BEM naming**: We enforced BEM naming conventions to reduce collisions.

In the end, we used a combination of all these techniques and just accepted that some manual coordination was necessary. It's not perfect, but it's manageable.

## Deployment

Each app is built and deployed independently to a CDN. The root config is also deployed separately. When we update an app, we just update its entry in the import map, and the next page load picks up the new version.

This is the real win of micro-frontends: independent deployments. The ERP team can ship updates without coordinating with the analytics team. As long as the contracts (routes, events) stay stable, everything works.

## Performance

Micro-frontends have a performance cost. You're loading multiple frameworks, multiple bundles, and orchestrating them at runtime. We saw a few issues:

**Initial load time**: Loading Vue 2, Vue 3, and React added about 200KB to the initial bundle. We mitigated this with lazy loading and code splitting.

**Memory usage**: Running multiple apps in the same page uses more memory. We didn't hit any limits, but it's something to watch.

**Mounting/unmounting overhead**: Single-SPA has to mount and unmount apps as you navigate. This is usually fast, but complex apps with lots of state can be slow to initialize.

Overall, the performance hit was acceptable for the flexibility we gained.

## Would I Do It Again?

Micro-frontends are not a silver bullet. They add complexity, and you should only use them if you have a real need (multiple teams, legacy apps, gradual migration, etc.).

For our use case, Single-SPA was the right choice. It let us integrate three disparate apps without a full rewrite, and it gave us a path forward for future apps. But if I were starting from scratch, I'd probably just build a monolith with good module boundaries. Micro-frontends are a solution to organizational problems, not technical ones.

That said, if you do need micro-frontends, Single-SPA is solid. The documentation is good, the community is helpful, and it works with any framework. Just be prepared for some rough edges around routing, state, and styling.
