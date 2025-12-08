# Personal Dashboard
Minimalist browser homepage with weather widget, clock, daily task tracker, and quick shortcuts.

## Description
A glassmorphism-styled dashboard for personal use. Displays real-time weather based on coordinates, shows contextual greetings, and tracks daily tasks with auto-reset at 7 AM.

## Features
- Real-time weather with animated backgrounds
- Clock with morning/afternoon/evening greetings
- Daily task checklist (auto-resets at 7 AM)
- Brave search integration
- Quick shortcuts grid
- LocalStorage persistence

## Usage
- Type into the search bar and press Enter to search via Brave.
- Click anywhere on a task card to open its link; click directly on the checkbox to toggle completion.
- Use the shortcuts grid on the sidebar to quickly open frequently used sites.

## Tech Stack
- Vanilla JavaScript
- CSS3 (custom properties, glassmorphism)
- Open-Meteo Weather API

## Structure
```
.
├── index.html
├── css/
│   └── style.css
└── js/
    ├── config.js
    └── script.js
```