# Lumen Relay — design notes

## Core loop

The player repeatedly reads a fragment's shape, reaches it, carries it across a hazardous field and completes the route at the matching gate. Each trip creates three small decisions:

1. Which fragment is safest to collect?
2. Which path avoids the moving interference?
3. Should dash be used now or saved for the return route?

The loop stays legible because the player carries only one fragment and the three destinations never change position during a run.

## Difficulty

Difficulty advances every five successful deliveries. Each wave changes several independent values:

- fragment spawn interval;
- fragment lifetime;
- number of interference entities;
- interference speed;
- steering strength.

The pure `difficultyFor()` function keeps this progression inspectable and testable.

## Scoring

A delivery starts at 100 points. Remaining fragment lifetime creates a speed bonus. Consecutive deliveries raise the multiplier by 0.25, capped at an eight-delivery chain. Contact with interference resets the chain.

This rewards fast routing without making a slow correct delivery worthless.

## Input model

Keyboard movement is direct. Pointer input uses press-and-drag steering toward a world-space target. Both feed the same normalized movement vector, so the simulation remains input-device independent.

Dash is a short speed and invulnerability window followed by a visible cooldown. It is defensive rather than an attack; interference is deflected but not destroyed.

## Visual language

The arena uses three redundant signal encodings:

- cyan circle;
- amber triangle;
- violet square.

Interference uses irregular red forms, while the player is a bright directional diamond. A dotted route guide appears only while carrying a fragment.

All art is rendered at runtime. No image, font, audio or shader files are required.

## State and failure handling

The game has four explicit phases: `intro`, `playing`, `paused` and `gameover`. Hidden tabs pause automatically. Frame deltas are capped to prevent a long inactive frame from moving entities through the player.

Local storage access is guarded so restricted storage contexts do not prevent play. Audio is created only after user interaction and can be disabled.
