---
title: "Building a Multi-Tenant POS System with Nuxt 3 and Pinia"
description: Architecting a scalable point-of-sale system that serves 30+ retail stores with tenant isolation, real-time inventory sync, and offline-first capabilities.
date: 2025-03-05
image: https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
minRead: 6
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
    alt: Aditia Dwi Pratomo
---

Building a POS system is hard. Building a multi-tenant POS system that works offline, syncs in real-time, and scales to dozens of stores is even harder. Last year, I architected and built exactly that using Nuxt 3 and Pinia, and I learned a ton about what works (and what doesn't) when building complex, stateful applications.

The requirements were straightforward but demanding: a single codebase that could serve multiple retail chains, each with their own branding, product catalogs, and business rules. It needed to work offline because internet connections in retail stores are unreliable. And it needed to be fast because cashiers don't wait for slow UIs.

## Why Nuxt 3 and Pinia?

I chose Nuxt 3 for a few reasons. First, SSR wasn't critical for a POS system (it's an authenticated app, not a public website), but Nuxt's file-based routing and auto-imports made development faster. Second, the Nuxt ecosystem has great tooling for PWAs, which we needed for offline support. Third, I was already comfortable with Vue 3, and Nuxt 3 gave us a solid foundation without having to wire up everything from scratch.

Pinia was an easy choice over Vuex. The API is cleaner, TypeScript support is better (even though we weren't using TS yet), and it integrates seamlessly with Composition API. Plus, Pinia stores are modular by default, which was perfect for our multi-tenant architecture.

## Multi-Tenancy Architecture

The trickiest part was tenant isolation. Each tenant (retail chain) needed their own data, but we couldn't afford to deploy separate instances for each one. We needed a single app that could dynamically load tenant-specific configurations.

Here's how we structured it:

```javascript
// stores/tenant.js
import { defineStore } from 'pinia'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    currentTenant: null,
    config: null,
    theme: null
  }),
  
  actions: {
    async loadTenant(tenantId) {
      // Fetch tenant config from API
      const response = await $fetch(`/api/tenants/${tenantId}`)
      
      this.currentTenant = response.tenant
      this.config = response.config
      this.theme = response.theme
      
      // Apply tenant-specific theme
      this.applyTheme()
    },
    
    applyTheme() {
      if (!this.theme) return
      
      // Dynamically inject CSS variables
      const root = document.documentElement
      root.style.setProperty('--primary-color', this.theme.primaryColor)
      root.style.setProperty('--secondary-color', this.theme.secondaryColor)
      root.style.setProperty('--logo-url', `url(${this.theme.logoUrl})`)
    }
  }
})
```

On app initialization, we'd detect the tenant from the subdomain or a query parameter, load their config, and apply their branding. This gave each tenant a customized experience without code duplication.

## State Management with Pinia

We organized our Pinia stores by domain:

- `useTenantStore()` - Tenant config and branding
- `useAuthStore()` - Authentication and user permissions
- `useCartStore()` - Shopping cart and checkout logic
- `useInventoryStore()` - Product catalog and stock levels
- `useSyncStore()` - Offline sync queue

The cart store was the most complex because it had to handle discounts, taxes, multiple payment methods, and split payments. Here's a simplified version:

```javascript
// stores/cart.js
import { defineStore } from 'pinia'
import { useInventoryStore } from './inventory'
import { useTenantStore } from './tenant'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    discounts: [],
    payments: []
  }),
  
  getters: {
    subtotal: (state) => {
      return state.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity)
      }, 0)
    },
    
    totalDiscount: (state) => {
      return state.discounts.reduce((sum, discount) => {
        return sum + discount.amount
      }, 0)
    },
    
    tax: (state) => {
      const tenantStore = useTenantStore()
      const taxRate = tenantStore.config.taxRate || 0
      return (state.subtotal - state.totalDiscount) * taxRate
    },
    
    total() {
      return this.subtotal - this.totalDiscount + this.tax
    },
    
    amountPaid: (state) => {
      return state.payments.reduce((sum, payment) => {
        return sum + payment.amount
      }, 0)
    },
    
    amountDue() {
      return Math.max(0, this.total - this.amountPaid)
    }
  },
  
  actions: {
    addItem(product, quantity = 1) {
      const inventoryStore = useInventoryStore()
      
      // Check stock availability
      if (!inventoryStore.hasStock(product.id, quantity)) {
        throw new Error('Insufficient stock')
      }
      
      // Check if item already in cart
      const existingItem = this.items.find(item => item.id === product.id)
      
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity
        })
      }
    },
    
    applyDiscount(discount) {
      // Validate discount rules
      if (discount.minPurchase && this.subtotal < discount.minPurchase) {
        throw new Error('Minimum purchase not met')
      }
      
      this.discounts.push(discount)
    },
    
    addPayment(method, amount) {
      if (amount > this.amountDue) {
        throw new Error('Payment exceeds amount due')
      }
      
      this.payments.push({
        method,
        amount,
        timestamp: Date.now()
      })
    },
    
    async checkout() {
      if (this.amountDue > 0) {
        throw new Error('Payment incomplete')
      }
      
      const transaction = {
        items: this.items,
        discounts: this.discounts,
        payments: this.payments,
        total: this.total,
        timestamp: Date.now()
      }
      
      // Save transaction (will sync when online)
      const syncStore = useSyncStore()
      await syncStore.queueTransaction(transaction)
      
      // Update inventory
      const inventoryStore = useInventoryStore()
      for (const item of this.items) {
        inventoryStore.decrementStock(item.id, item.quantity)
      }
      
      // Clear cart
      this.reset()
      
      return transaction
    },
    
    reset() {
      this.items = []
      this.discounts = []
      this.payments = []
    }
  }
})
```

The key insight here is that Pinia stores can call other stores directly. This made it easy to coordinate between cart, inventory, and sync logic without prop drilling or event buses.

## Offline-First with IndexedDB

The offline requirement was non-negotiable. Stores lose sales if the POS goes down every time the internet hiccups. We used IndexedDB (via `idb` library) to persist all critical data locally.

```javascript
// utils/db.js
import { openDB } from 'idb'

const DB_NAME = 'pos-db'
const DB_VERSION = 1

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        txStore.createIndex('synced', 'synced')
        txStore.createIndex('timestamp', 'timestamp')
      }
    }
  })
}

export async function saveTransaction(transaction) {
  const db = await initDB()
  return db.add('transactions', {
    ...transaction,
    synced: false
  })
}

export async function getUnsyncedTransactions() {
  const db = await initDB()
  return db.getAllFromIndex('transactions', 'synced', false)
}
```

The sync store would periodically check for unsynced transactions and push them to the server when online:

```javascript
// stores/sync.js
import { defineStore } from 'pinia'
import { saveTransaction, getUnsyncedTransactions } from '@/utils/db'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    online: navigator.onLine,
    syncing: false,
    pendingCount: 0
  }),
  
  actions: {
    async queueTransaction(transaction) {
      await saveTransaction(transaction)
      this.pendingCount++
      
      // Try to sync immediately if online
      if (this.online) {
        this.sync()
      }
    },
    
    async sync() {
      if (this.syncing || !this.online) return
      
      this.syncing = true
      
      try {
        const transactions = await getUnsyncedTransactions()
        
        for (const tx of transactions) {
          await $fetch('/api/transactions', {
            method: 'POST',
            body: tx
          })
          
          // Mark as synced in IndexedDB
          await markTransactionSynced(tx.id)
          this.pendingCount--
        }
      } catch (error) {
        console.error('Sync failed:', error)
      } finally {
        this.syncing = false
      }
    },
    
    startSyncInterval() {
      // Sync every 30 seconds when online
      setInterval(() => {
        if (this.online && this.pendingCount > 0) {
          this.sync()
        }
      }, 30000)
      
      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.online = true
        this.sync()
      })
      
      window.addEventListener('offline', () => {
        this.online = false
      })
    }
  }
})
```

This gave us a robust offline-first system. Cashiers could keep working even if the internet went down, and transactions would sync automatically when connectivity returned.

## Performance Optimizations

POS systems need to be fast. We did several things to keep the UI snappy:

**Virtual scrolling**: Product catalogs can have thousands of items. We used `vue-virtual-scroller` to render only visible items.

**Debounced search**: Product search was debounced to avoid hammering the database on every keystroke.

**Lazy loading**: We split the app into chunks and lazy-loaded routes that weren't immediately needed.

**Optimistic updates**: When adding items to the cart, we updated the UI immediately without waiting for validation. If validation failed, we'd roll back.

## Deployment and Scaling

We deployed the Nuxt app as a static SPA (using `nuxt generate`) and served it from a CDN. The API was a separate Go service that handled tenant data, authentication, and transaction processing.

Each store ran the same frontend code, but with tenant-specific configs loaded at runtime. This made deployments simple: push once, and all tenants get the update.

We're currently serving 30+ stores with this architecture, and it's been rock solid. The offline-first approach has saved us from countless support calls, and the multi-tenant design means we can onboard new clients in minutes instead of days.

## What I'd Do Differently

If I were starting over, I'd use TypeScript from day one. Pinia has excellent TS support, and it would've caught several bugs that slipped through. I'd also invest more in automated testing earlier. We have decent E2E coverage now (Playwright), but unit tests for the stores would've made refactoring less scary.

Overall, Nuxt 3 and Pinia were great choices for this project. The developer experience was smooth, the performance is excellent, and the architecture scales well. If you're building a complex, stateful app with Vue, I'd highly recommend this stack.
