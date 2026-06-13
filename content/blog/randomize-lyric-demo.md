---
title: "Randomize Lyric — A Tiny Web Toy"
description: A small interactive demo I built to randomize song lyrics. Embedded directly into this post so you can play with it without leaving the page.
date: 2026-06-12
image: https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1470&q=80
minRead: 2
author:
  name: Aditia Dwi Pratomo
  avatar:
    src: /me/gelap.jpg
    alt: Aditia Dwi Pratomo
---

Sometimes the best way to explain a thing is to let someone touch it. Static screenshots tell you what something looks like. A live demo tells you what it feels like.

This is a small web toy I deployed at `randomize-lyric.vercel.app`. Click around, see how it behaves, then come back.

::project-embed{src="https://randomize-lyric.vercel.app/" title="Randomize Lyric"}
::

The embed above is a Vue component I added to this site so I can drop interactive demos straight into any blog post. It lazy-loads the iframe, gives you a fullscreen toggle, and falls back gracefully if the embed misbehaves.

The pattern is dead simple, but it changes how I think about writing. Instead of describing a feature, I can show it. Instead of pasting a code block and asking you to imagine the output, you just play with the thing.
