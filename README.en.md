# NEOSOUL — Interest-first voice social

[中文 README](README.md)

[![CI](https://github.com/tim0n1994/Neosoul/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tim0n1994/Neosoul/actions/workflows/ci.yml)
[![Stable release](https://img.shields.io/github/v/release/tim0n1994/Neosoul?label=release)](https://github.com/tim0n1994/Neosoul/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[Security policy](SECURITY.md)

> Voice social without the paywall maze.

Neosoul is a Next.js/PWA voice-social prototype built around interests rather than payment gates. It keeps the core social path open, gives creators a route to rewards, and makes safety rules visible.

~~~text
interest → room → conversation → moderation → creator value
~~~

The current public line uses Next.js 15, React 19, Supabase, LiveKit, and a lightweight 3D/PWA surface. The deployed preview is https://neosoul.udify.fun.

## Start locally

~~~bash
pnpm install
cp .env.example .env.local
pnpm dev
~~~

Configure Supabase and LiveKit for auth, storage, realtime data, and voice rooms. The repository documents the required environment names and server-only secret boundaries.

## Current release boundary

The current stable release is [v0.1.2](https://github.com/tim0n1994/Neosoul/releases/tag/v0.1.2). CI, provider smoke checks, and browser E2E are separate signals in the release evidence.

Stripe remains an optional future capability. It is not required by this release and is not part of the current smoke or health gate.

This is a public stable preview of the application path. External service credentials, live provider accounts, moderation policy, and production operations remain deployment concerns rather than repository contents.