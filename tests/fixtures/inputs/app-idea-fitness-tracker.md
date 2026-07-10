# Fitness Tracker App — Grilled Summary

## Core Idea
A mobile-first fitness tracking app that helps casual gym-goers build consistent workout habits through simple logging and gentle accountability.

## Who Is This For?
- Casual gym-goers (2-4x/week) who want to track progress without complexity
- People who've bounced off apps like Strong or Hevy because they're too detailed
- Age range: 25-40, moderate tech comfort

## What Makes It Different?
- **Minimal friction logging**: tap-to-log exercises from recent history, no rep/set counting required unless you want it
- **Streak-based motivation**: focus on consistency (did you go?) rather than performance metrics
- **Social accountability**: optional buddy system where a friend can see your streak (not your lifts)

## What Does Success Look Like?
- Users log 3+ sessions per week for 4+ consecutive weeks
- Retention at 30 days > 40%
- Users describe it as "the app that actually stuck"

## What's Explicitly NOT In Scope?
- No diet/nutrition tracking
- No AI-generated workout plans (v1)
- No wearable integrations (v1)
- No social feed or community features beyond buddy streaks

## Open Questions From Questioning
- Should we support bodyweight-only workouts or gym-only?
- How do we handle rest days without breaking streaks?
- Is the buddy system opt-in at signup or discoverable later?

## Technical Leanings
- React Native for cross-platform
- Supabase for backend (auth + DB + realtime for buddy sync)
- Expo for build/deploy pipeline
