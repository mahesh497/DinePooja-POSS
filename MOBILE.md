# DinePooja mobile app (Android)

The POS is a **Capacitor native app** that opens your Next.js server inside a fullscreen Android WebView (real installable APK, home-screen icon, native GPS).

> Phone and PC must be on the **same Wi‑Fi**. The app talks to the POS server on your computer.

## 1. One-time setup on this PC

1. Install **[Android Studio](https://developer.android.com/studio)** (includes Android SDK).
2. Open Android Studio once → finish SDK setup.
3. In this project folder:

```bash
npm install
npx cap add android
npm run cap:sync
```

## 2. Point the app at your POS server

Your LAN IP is used in `capacitor.config.ts` (currently `http://192.168.0.108:3000`).

If your IP changed:

```powershell
# PowerShell — show IPv4
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' }
```

Then either edit `capacitor.config.ts`, or:

```powershell
$env:CAPACITOR_SERVER_URL="http://YOUR_LAN_IP:3000"
npm run cap:sync
```

Also set NextAuth URL in `.env`:

```env
NEXTAUTH_URL=http://YOUR_LAN_IP:3000
NEXTAUTH_SECRET=any-long-random-string
```

## 3. Run the POS server for phones

```bash
npm run build
npm run start:mobile
```

(`start:mobile` binds `0.0.0.0` so phones on Wi‑Fi can connect.)

For day-to-day coding:

```bash
npm run dev:mobile
```

## 4. Build / run the Android app

```bash
npm run mobile:android
```

In Android Studio:

- Connect a phone (USB debugging) **or** start an emulator
- Click **Run ▶**
- Or **Build → Build Bundle(s) / APK(s) → Build APK(s)** and install the APK

## 5. What you get on the phone

- Installable **DinePooja POS** app icon
- Fullscreen (no browser chrome)
- Android back button → previous screen
- Native **GPS** for Delivery partner tracking
- Same login / POS / KOT / tables as the web app

## iOS

Same Capacitor project works with Xcode on a Mac:

```bash
npm install -D @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

## Hosted cloud instead of LAN

Deploy the Next.js app (Vercel, VPS, etc.), then:

```powershell
$env:CAPACITOR_SERVER_URL="https://your-pos-domain.com"
npm run cap:sync
```

Rebuild the APK. Phones no longer need to be on the same Wi‑Fi as a PC.
