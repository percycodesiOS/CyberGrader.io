# Deploy Guide (Beginner-Friendly)

You're going from "code on my computer" to "real URL my students can visit." Follow these steps in order. Skip nothing.

You'll need:

- A laptop (Mac or Windows)
- A Google account
- ~30 min the first time

---

## Step 1 — Install the basics on your laptop

1. Install **Node.js** (this gives you `npm`).
   Go to <https://nodejs.org> → download the **LTS** version → install it like any normal app.
   To verify, open Terminal (Mac) or Command Prompt (Windows) and run:
   ```bash
   node --version
   npm --version
   ```
   Both should print a version number.

2. Install the **Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```
   Verify:
   ```bash
   firebase --version
   ```

3. Log in to Firebase from the command line (opens a browser):
   ```bash
   firebase login
   ```
   Use the Google account you want to own this project.

---

## Step 2 — Create your Firebase project

1. Go to <https://console.firebase.google.com>.
2. Click **Add project**. Name it something like `percycodes-gamebash`. Click through the defaults (Google Analytics is optional — say no if you want).
3. Once it's created, you're in the project dashboard.

### Enable the services this app uses

In the left sidebar of the Firebase Console:

1. **Authentication** → Get started.
   - Click **Sign-in method** tab.
   - Enable **Google** (this is for teachers). Set support email to yours. Save.
   - Enable **Anonymous** (this is for students). Save.

2. **Firestore Database** → Create database.
   - Pick a region close to you (e.g. `us-east1`).
   - Start in **production mode** (we deploy real security rules in a moment).

3. **Storage** → Get started. Same region as Firestore. Use the default rules for now.

### Get your Firebase config

1. In the Firebase Console, click the ⚙️ gear icon (top-left) → **Project settings**.
2. Scroll down to **Your apps**.
3. Click the **`</>`** (web) icon to register a new web app.
4. Give it a nickname like "gamebash-web". **Don't** check "set up Firebase Hosting" here — we'll do that from the CLI. Click **Register app**.
5. Firebase shows you a `firebaseConfig` object that looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123...",
     appId: "1:123:web:abc..."
   };
   ```
   **Copy these values.** You'll need them in a second.

---

## Step 3 — Get the code onto your laptop

1. Download this project as a ZIP (from the file menu in your editor), or `git clone` it. Either works.
2. Unzip it somewhere you can find. Open a terminal **inside that folder**.
3. Install dependencies:
   ```bash
   npm install
   ```
   This takes a minute or two.

---

## Step 4 — Plug in your Firebase config

1. Find the file `firebase-applet-config.example.json` in the project root.
2. Make a copy of it named exactly `firebase-applet-config.json` (drop the `.example`).
3. Open the new file and replace each `REPLACE_WITH_...` value with the values from your Firebase config in Step 2.
   - `firestoreDatabaseId` stays as `"(default)"` unless you created a non-default database (you didn't).
4. Open `.firebaserc` and replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID` with your real Firebase project ID (the `projectId` value from the config).

> ⚠️ `firebase-applet-config.json` is in `.gitignore`, so it never gets committed. Good.

---

## Step 5 — Update the admin email (if it's not yours)

The teacher/admin is currently hardcoded as `kmacek715@gmail.com`. If that's you, skip this step. Otherwise:

1. Open `src/App.tsx` → search for `kmacek715@gmail.com` → replace with your email (2 places).
2. Open `firestore.rules` → same replacement (1 place).

---

## Step 6 — Test it locally

```bash
npm run dev
```

Open <http://localhost:5173>. Sign in with the admin Google account. If you see the Lobby, you're good.

First time, the Lobby will be empty. Click **"Make a demo game"** (only visible to teachers) to seed three sample games.

If you get errors in the browser console about Firestore permissions, that's expected until Step 7.

---

## Step 7 — Deploy the security rules

The Firestore rules in `firestore.rules` lock the database down properly. Push them to Firebase:

```bash
firebase deploy --only firestore:rules
```

Now the permission errors should be gone (refresh the local app).

---

## Step 8 — Deploy the app to Firebase Hosting

```bash
npm run deploy
```

This does two things:
1. Builds the production bundle into `dist/`
2. Uploads it to Firebase Hosting

When it finishes, it prints a URL like `https://your-project.web.app`. **That's your live app.** Share it with students.

---

## Step 9 — Authorize your live domain for Google sign-in

One last gotcha: by default Google sign-in only works on `localhost`. Add your hosting domain:

1. Firebase Console → **Authentication** → **Settings** tab → **Authorized domains**.
2. Add `your-project.web.app` and `your-project.firebaseapp.com` (Firebase usually adds these automatically, but check).

---

## Day-to-day after the first deploy

Make code changes locally → test with `npm run dev` → when you're happy, ship:

```bash
npm run deploy
```

If you only changed Firestore rules:

```bash
npm run deploy:rules
```

---

## Common gotchas

**"Firebase: Error (auth/unauthorized-domain)" on the live site.**
You skipped Step 9. Add your `.web.app` domain to authorized domains.

**"FirebaseError: Missing or insufficient permissions" everywhere.**
You didn't deploy the security rules. Run `npm run deploy:rules`.

**`npm install` fails with weird peer-dep errors.**
Delete `node_modules` and `package-lock.json`, then `npm install` again.

**Storage uploads fail in the editor.**
You need to deploy Storage rules too. Make a `storage.rules` file mirroring the Firestore intent, or temporarily set them to allow authenticated users via the Firebase Console.

**Anonymous students can't sign in.**
You forgot to enable Anonymous auth in Step 2.

---

## What if something is still broken?

Send me:
1. A screenshot of the browser console errors (F12 → Console tab)
2. What step you were on
3. The exact terminal output if it's a CLI error

And I'll debug.
