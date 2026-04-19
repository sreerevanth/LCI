# 🧠 Live Cognitive Interface (LCI)

## 🎬 Demo

![LCI Demo](assets/demo.png)

---

## 🚀 Overview

Live Cognitive Interface (LCI) is an experimental AI system that adapts the user interface in real-time based on user behavior.

It observes interaction patterns such as typing speed, hesitation, clicks, and inactivity to infer cognitive states and dynamically adjust the UI.

---

## 🧠 Cognitive States

* 🤔 Confused
* 💭 Thinking
* ⚡ Confident
* 😴 Idle

The interface reacts intelligently to guide users, reduce friction, and improve usability.

---

## ✨ Features

* 🔄 Real-time interaction tracking
* 🧠 Cognitive state classification
* ⚡ WebSocket-based live updates
* 🎨 Adaptive UI (highlighting, simplification, feedback)
* 💡 Context-aware help messages
* 🔧 State smoothing & stability handling

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS
* Framer Motion

### Backend

* Node.js
* Express
* WebSocket (`ws`)

---

## 🧩 Architecture

User Interaction → Event Stream → Backend (WebSocket)
→ Cognitive State Classification → UI Adaptation → Frontend Update

---

## 📂 Project Structure

```
lci/
  backend/
    server.js
    package.json

  frontend/
    index.html
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js

    src/
      App.jsx
      main.jsx
      index.css

      components/
      hooks/
```

---

## ⚙️ Setup

### Backend

```
cd
```
