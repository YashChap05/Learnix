# Learnix App Conversion Guide

This repository now includes wrappers so your existing website can be run as:

- **Desktop app** using Electron (Windows/macOS/Linux)
- **Mobile app** using Capacitor (Android/iOS project generation)

The UI is still your original Learnix web pages from `public/`, so the look remains unchanged.

## 1) Install dependencies

```bash
npm install
```

## 2) Run desktop app locally

```bash
npm run desktop:dev
```

This starts the Express server and opens an Electron window pointed to `http://127.0.0.1:3456`.

## 3) Build desktop installers

```bash
npm run desktop:dist
```

Output binaries/installers are generated in the `release/` folder.

## 4) Create mobile projects

```bash
npm run mobile:sync
npm run mobile:android
# or
npm run mobile:ios
```

This opens native projects in Android Studio / Xcode where you can build APK/IPA files.

## 5) Downloadable package file

To generate a single downloadable archive with app-shell files:

```bash
npm run app:package
```

This creates:

- `release/Learnix-App-Download.zip`

You can download and share that zip file without pushing directly to GitHub.
