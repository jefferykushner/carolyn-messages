# Morning Messages for Carolyn — Setup Guide
## Complete step-by-step deployment

---

## STEP 1 — Supabase Setup (10 minutes)

1. Go to **supabase.com** → open your existing account
2. Create a **new project** called `carolyn-messages`
3. Once created, go to **SQL Editor** and run this:

```sql
-- Affirmations table (one row per day)
CREATE TABLE affirmations (
  date      DATE PRIMARY KEY,
  image_1   TEXT,   -- Self-affirmation
  image_2   TEXT,   -- For You / third-person
  image_3   TEXT,   -- Scripture
  image_4   TEXT,   -- Door Note
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public reads on affirmations (Carolyn's viewer)
ALTER TABLE affirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON affirmations FOR SELECT USING (true);
CREATE POLICY "service write" ON affirmations FOR ALL USING (true);

-- Allow push subscriptions to be inserted publicly
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "service all" ON push_subscriptions FOR ALL USING (true);
```

4. Go to **Storage → Create bucket** named: `affirmation-images`
   - Set to **Public**

5. Go to **Project Settings → API**
   - Copy your **Project URL** → this is `SUPABASE_URL`
   - Copy your **anon public key** → this is `SUPABASE_ANON_KEY`
   - Copy your **service_role key** → this is `SUPABASE_SERVICE_KEY` (keep this secret!)

---

## STEP 2 — Generate VAPID Keys (2 minutes)

VAPID keys are what allow push notifications to work securely.

Run this in your terminal (Node must be installed):
```bash
npx web-push generate-vapid-keys
```

Copy the output — you'll get a Public Key and a Private Key.

---

## STEP 3 — Deploy to Netlify (5 minutes)

1. Push this project folder to a **new GitHub repo** (e.g. `carolyn-messages`)
2. Go to **app.netlify.com** → Add new site → Import from GitHub
3. Select your repo. Build settings:
   - Build command: *(leave blank)*
   - Publish directory: `public`
4. Click **Deploy**

---

## STEP 4 — Set Environment Variables in Netlify

Go to **Site Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `VAPID_PUBLIC_KEY` | From Step 2 |
| `VAPID_PRIVATE_KEY` | From Step 2 |
| `VAPID_SUBJECT` | `mailto:your@email.com` |
| `CRON_SECRET` | Any random password you invent (e.g. `sunshine2024`) |

---

## STEP 5 — Update the HTML files

In `public/index.html` and `public/admin.html`, replace:
- `YOUR_SUPABASE_URL` → your actual Supabase URL
- `YOUR_SUPABASE_ANON_KEY` → your actual anon key
- `YOUR_VAPID_PUBLIC_KEY` → your VAPID public key from Step 2

Redeploy after saving.

---

## STEP 6 — Protect the Admin Page

In Netlify → **Site Settings → Access Control → Password Protection**
- Enable password protection for `/admin.html`
- Set a password only you know

---

## STEP 7 — Set Up the 8am Cron Job (2 minutes)

1. Go to **cron-job.org** → Create free account
2. Create a new cron job:
   - URL: `https://YOUR-SITE.netlify.app/.netlify/functions/send-morning-push`
   - Schedule: Every day at **8:00 AM** (your timezone)
   - Add Header: `x-cron-secret: YOUR_CRON_SECRET` (the one you set in Step 4)

---

## STEP 8 — Add App Icons

Create two simple pink heart icons and save as:
- `public/icon-192.png` (192×192px)
- `public/icon-512.png` (512×512px)
- `public/badge-72.png` (72×72px, monochrome for notification badge)

You can generate these at **realfavicongenerator.net**

---

## STEP 9 — Carolyn's One-Time Setup (on her iPhone)

1. Text her the link to your site
2. She opens it in **Safari** (must be Safari on iPhone)
3. Taps the **Share button** → **"Add to Home Screen"**
4. Taps **"Turn on morning messages"** when prompted
5. Done! She'll receive a push at 8am every day you publish ♡

---

## YOUR DAILY ROUTINE (< 2 minutes)

1. Generate 4 images in ChatGPT/DALL·E as usual
2. Open `yoursite.netlify.app/admin.html`
3. Confirm the date, drop in the 4 images
4. Tap **Publish**

Carolyn's notification goes out at 8am. She taps it. She smiles. ♡

---

## TROUBLESHOOTING

**Notification not arriving?**
- Confirm cron-job.org job is enabled
- Check Netlify Functions logs for errors
- Make sure Carolyn allowed notifications in Safari

**Images not showing?**
- Confirm Supabase storage bucket is set to Public
- Check CORS settings in Supabase (Storage → Policies)

**Admin page accessible to anyone?**
- Enable Netlify password protection (Step 6)
