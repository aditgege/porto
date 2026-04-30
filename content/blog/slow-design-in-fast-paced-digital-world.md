---
title: "Why I Went Direct-to-Code and Stopped Using Figma for UI Prototyping"
description: How I ditched the design handoff process and started building UI directly in Vue components, and why it made me faster and more effective.
date: 2025-01-20
image: https://images.pexels.com/photos/4050314/pexels-photo-4050314.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
minRead: 7
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D
    alt: Aditia Dwi Pratomo
---

I used to follow the "proper" process: sketch ideas, create wireframes in Figma, design high-fidelity mockups, get approval, then hand off to development. It felt professional and organized. It was also slow, frustrating, and often resulted in designs that didn't survive contact with real code.

About two years ago, I stopped. Now I prototype directly in Vue components, skip Figma entirely for most projects, and ship features faster with fewer surprises. This isn't for everyone, but for me as a frontend engineer who understands both design and code, it's been a game changer.

## The Problem with Design Handoff

The traditional design-to-development workflow has a fundamental issue: the design tool and the implementation environment are completely different. What looks perfect in Figma often breaks down when you add real data, edge cases, and browser constraints.

I'd spend hours perfecting a design in Figma, only to discover during implementation that:

- The layout doesn't work with dynamic content lengths
- The spacing doesn't align with our existing component library
- The interaction I designed isn't feasible with our state management
- The design assumes perfect data that doesn't exist in production

Then I'd have to go back to Figma, adjust the design, get re-approval, and implement again. This back-and-forth wasted time and killed momentum.

## The Direct-to-Code Approach

Now my process looks like this:

1. Sketch rough ideas on paper (still useful for thinking)
2. Open VS Code and start building components
3. Iterate in the browser with real data
4. Refine based on what actually works
5. Ship

No Figma. No handoff. No translation layer between design and code.

Here's what a typical prototyping session looks like:

```vue
<!-- components/ProductCard.vue -->
<template>
  <div class="product-card">
    <img :src="product.image" :alt="product.name" class="product-image" />
    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      <p class="product-price">{{ formatPrice(product.price) }}</p>
      <button @click="addToCart" class="add-to-cart">
        Add to Cart
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  product: Object
})

const emit = defineEmits(['add-to-cart'])

const formatPrice = (price) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(price)
}

const addToCart = () => {
  emit('add-to-cart', props.product)
}
</script>

<style scoped>
.product-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.product-info {
  padding: 16px;
}

.product-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: #2563eb;
  margin: 0 0 16px 0;
}

.add-to-cart {
  width: 100%;
  padding: 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-to-cart:hover {
  background: #1d4ed8;
}
</style>
```

I can see this component immediately in the browser with real product data. If the name is too long, I see it break the layout right away. If the price formatting looks weird, I fix it on the spot. If the hover state feels wrong, I adjust the transition timing.

This tight feedback loop is way faster than designing in Figma, exporting specs, and then discovering issues during implementation.

## Tailwind CSS Made This Possible

I couldn't do this effectively without Tailwind CSS. Tailwind lets me iterate on styles incredibly fast without leaving the template:

```vue
<template>
  <div class="rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
    <img :src="product.image" :alt="product.name" class="w-full aspect-square object-cover" />
    <div class="p-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ product.name }}</h3>
      <p class="text-xl font-bold text-blue-600 mb-4">{{ formatPrice(product.price) }}</p>
      <button 
        @click="addToCart"
        class="w-full py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
      >
        Add to Cart
      </button>
    </div>
  </div>
</template>
```

I can tweak spacing, colors, and typography in seconds. No context switching between Figma and code. No "let me check what the exact padding was in the design." It's all right there.

## When I Still Use Figma

I'm not completely anti-Figma. There are cases where I still use it:

**Client presentations**: Some clients need to see mockups before approving work. For them, I'll create quick Figma mockups, but I keep them low-fidelity and don't obsess over pixel perfection.

**Complex illustrations**: If I need custom icons or illustrations, I'll use Figma or get them from a designer. I'm not an illustrator.

**Design systems documentation**: For documenting component libraries and design tokens, Figma is still useful as a reference.

**Collaboration with designers**: If I'm working with a dedicated designer, we'll use Figma as a shared workspace. But even then, I push for early code prototypes.

## The Benefits

Going direct-to-code has several advantages:

**Speed**: I ship features 30-40% faster because there's no design-to-code translation step.

**Accuracy**: What I build is what ships. No "this doesn't match the design" debates.

**Real constraints**: I design within the constraints of the actual platform (browser, framework, component library). No impossible designs.

**Better edge cases**: I catch edge cases early because I'm working with real data from the start.

**Easier iteration**: Changing a design is just changing code. No need to update Figma, export new specs, and re-implement.

## The Tradeoffs

This approach isn't perfect. There are downsides:

**Requires coding skills**: You need to be comfortable writing HTML, CSS, and JavaScript. This won't work if you're a pure designer.

**Less visual exploration**: Figma is better for exploring wildly different visual directions. Code is better for iterating on a chosen direction.

**Harder to get early feedback**: Stakeholders often want to see designs before you write code. With this approach, the code *is* the design.

**Temptation to skip planning**: It's easy to jump straight into code without thinking through the problem. I still sketch on paper first to avoid this.

## My Current Workflow

Here's what a typical feature looks like now:

1. **Understand the requirement**: Talk to stakeholders, understand the user need.

2. **Sketch on paper**: Draw rough layouts and flows. This takes 10-15 minutes and helps me think through the problem.

3. **Build a rough prototype**: Create basic components with placeholder styles. Focus on structure and functionality.

4. **Add real data**: Hook up the prototype to real APIs or mock data that matches production.

5. **Refine the UI**: Iterate on spacing, colors, typography, and interactions until it feels right.

6. **Test edge cases**: Try long text, missing data, error states, different screen sizes.

7. **Get feedback**: Show the working prototype to stakeholders. Make adjustments based on their input.

8. **Ship**: The prototype *is* the implementation. Just clean up the code and deploy.

This whole process usually takes a day or two for a medium-sized feature, compared to a week with the traditional design-first approach.

## Tools That Help

A few tools make this workflow smoother:

**Tailwind CSS**: Fast styling without leaving the template.

**Vue DevTools**: Inspect component state and props in real-time.

**Vite HMR**: Instant feedback when I change code. No waiting for rebuilds.

**Browser DevTools**: Tweak styles directly in the browser, then copy the changes back to code.

**Storybook**: For building and testing components in isolation (though I don't always use it for prototyping).

## Who This Works For

This approach works best if you:

- Are comfortable with HTML, CSS, and JavaScript
- Understand design principles (layout, typography, color, spacing)
- Work on a small team or solo
- Have direct access to stakeholders for feedback
- Are building web apps (not marketing sites or brand-heavy projects)

It doesn't work well if you:

- Need to collaborate with non-technical designers
- Work on projects with heavy branding or illustration needs
- Need to present designs to clients before building
- Are on a large team with separate design and dev roles

## The Mindset Shift

The hardest part of going direct-to-code isn't technical, it's mental. You have to let go of the idea that design and development are separate phases. They're not. They're the same thing, just at different levels of fidelity.

When I design in code, I'm not "skipping design." I'm designing in the medium where the product will actually live. The browser is my canvas. Vue components are my design tool. CSS is my visual language.

This mindset shift took time, but once it clicked, I became way more effective. I'm not a designer who hands off to developers. I'm not a developer who implements designs. I'm someone who builds interfaces, and I use whatever tools make that process fastest and most effective.

For me, that means code, not Figma.
