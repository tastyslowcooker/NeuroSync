# BinBeat // Procedural Binaural Entrainment Lab

A zero-asset, mathematically synthesized multi-stage binaural entrainment and acoustic soundscape synthesizer built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Web Audio API DSP**. Ready for immediate deployment to **Cloudflare Pages**.

---

## ⚡ Features

- **100% Mathematical Audio DSP**: Pure client-side synthesis with zero external audio assets or audio files.
- **AudioWorklet Noise Engine**: Real-time Paul Kellet pink noise and leaky-integrator brown noise running on a dedicated audio rendering thread, with automatic fallback for older environments.
- **Dynamic Multi-Stage Entrainment Programs**:
  - **90-Min Focused Studying (v2 Style)**: Alpha induction into cycling Beta waves (14–21 Hz) with carrier pitch modulation.
  - **8-Hour Full Sleep Cycle**: Descent into 0.5 Hz Deep Delta rest cycles through five ultradian sleep stages.
  - **30-Min Power Nap**: Fast Alpha/Theta border recharge with an alerting Beta wake-up ramp.
  - **60-Min Deep Meditation**: Cosmic 136.1 Hz "Om" and 128 Hz Earth harmonic immersion.
- **Interactive Multi-Stage Timeline Canvas**: High-DPI canvas graph displaying Beat Δ (cyan curve) and Carrier Pitch (indigo dashed line). Click and drag anywhere to scrub seamlessly through the session.
- **Custom Stage Builder**: Expandable visual table editor to add, customize, and save custom multi-stage programs directly in your browser (`localStorage`).
- **Real-Time Oscilloscopes**:
  - Dual-wave interference canvas displaying Left ear, Right ear, and composite amplitude envelope.
  - X-Y Lissajous phase pattern showing phase relationships and rotational drift.
- **Procedural Acoustic Mixer**:
  - Independent gain controls for Pure Sine Binaural beats, Noise Masking, and Harmonic Drone pads (-1 Octave / +5th).
  - Variable low-pass filter (80 Hz – 2500 Hz) to sculpt brown/pink noise warmth.
- **Stereo Diagnostic Verification**: One-click **Mute Left / Mute Right** isolation to verify true stereo separation (ensuring spatial audio / Dolby Atmos isn't artificially corrupting binaural phase).
- **Screen Wake Lock API**: Prevents devices from dimming or sleeping during meditation or study sessions.
- **PWA & Offline Ready**: Fast static delivery with Web App Manifest and offline capability.

---

## 🛠️ Development & Building

### Prerequisites
- Node.js 18+ (tested on Node 24)
- npm or pnpm

### Quickstart

```bash
# Install dependencies
npm install

# Start local development server with instant HMR
npm run dev

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The production output is placed in the `dist/` directory.

---

## 🚀 Deploying to Cloudflare Pages

BinBeat is pre-configured for Cloudflare Pages out of the box with `public/_headers` (optimized cache & permissions policies) and `public/_redirects` (SPA routing).

### Method 1: Git Integration (Recommended)
1. Push your repository to **GitHub** or **GitLab**.
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages**.
3. Connect your Git repository.
4. Set the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Cloudflare will automatically build and deploy every commit!

### Method 2: Direct Upload via Wrangler CLI
Deploy directly from your terminal in seconds:

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=binbeat
```

---

## 🎹 Keyboard Shortcuts

- `Space` — Toggle Play / Pause
- `M` — Toggle Manual Frequency Lock / Timeline Mode
- `R` — Restart timeline to 0:00

---

## 📄 License
MIT License. Crafted for high-performance cognitive entrainment.
