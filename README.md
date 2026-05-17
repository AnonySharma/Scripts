# 🚀 Web Experience Scripts

A curated collection of lightweight client-side scripts designed to bypass artificial browser limitations, optimize media playback, and elevate your everyday web browsing experience.

---

## 🛠️ Scripts Directory

| Script Name | Deployment Format | File Path | Quick Link / Source |
| :--- | :--- | :--- | :--- |
| **AnonySub** | Tampermonkey (Automation) | `AnonySub/AnonySub.user.js` | [📥 Direct Install](https://github.com/AnonySharma/Scripts/raw/main/AnonySub/AnonySub.user.js) |
| **AnonySub** | Console Raw (Manual) | `AnonySub/AnonySub.console.js` | [📄 View Source](https://github.com/AnonySharma/Scripts/blob/main/AnonySub/AnonySub.console.js) |

---

## 📺 AnonySub

Injects custom `.srt` or `.vtt` subtitle files directly over any web video stream with guaranteed fullscreen overlay compatibility in Chrome. 

### ✨ Key Features
* **True Fullscreen Support:** Secure container sandbox forces the overlay layout to float perfectly on top of fullscreen video layers.
* **Interactive Transcript Sidebar:** Active dialogue tracking lets you click any line to instantly jump to that exact timestamp.
* **Smart Sync Tuning:** Live keyword text filtering and a real-time timing offset range slider (±10s).
* **Collapsible Mini-Mode:** Shrinks down into a minimalist, non-intrusive `+` button to keep your stream clutter-free.

### 📥 Setup Instructions

#### Option 1: Userscript Manager (Recommended)
Automatically runs the engine whenever an online video element is detected.
👉 **[Click Here to Install Directly via Tampermonkey](https://github.com/AnonySharma/Scripts/raw/main/AnonySub/AnonySub.user.js)**

#### Option 2: DevTools Console Injection
For quick, extension-free execution on any active tab:
1. Open the [AnonySub.console.js Source](https://github.com/AnonySharma/Scripts/raw/main/AnonySub/AnonySub.console.js) and copy the plain text code block.
2. Open your browser's dev console (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
3. Paste the code and hit **Enter**.

> 💡 **Pro-Tip:** To trigger the true fullscreen layer where the subtitle menu stays completely visible, **Double-Click** anywhere on the video or hit the **📺 icon** inside the panel header.

---

## 🔒 Security & Privacy
All utilities run strictly on the client side. Your loaded media, data variables, and subtitle uploads are processed locally inside your browser cache and are never transmitted to external servers.
