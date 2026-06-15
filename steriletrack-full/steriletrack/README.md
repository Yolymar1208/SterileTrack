# 🏥 SterileTrack — CSSD Management System

A modern, cloud-based CSSD (Central Sterile Supply Department) management system for hospitals. Built with Next.js, Supabase, and deployed on Vercel.

---

## ✨ Features

- **QR Code Tracking** — Scan any item to instantly update its status
- **Full Chain of Custody** — Every action logged with user, time, and location
- **Real-Time Dashboard** — Live overview of all workflow stages
- **Inventory Management** — Search, filter, and track all sterile items
- **Workflow Pipeline** — Decontamination → Assembly → Sterilization → Storage → Dispatch
- **Alerts System** — Missing items, delays, expiring supplies
- **Audit Trail** — Permanent, immutable record of all actions (CSV export)
- **Analytics** — Inventory distribution and expiry monitoring
- **Mobile-Ready** — Works on phones, tablets, and desktops

---

## 🚀 Deploy in 4 Steps

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** → give it a name (e.g. "steriletrack") → set a database password
3. Wait for the project to launch (~2 minutes)
4. Go to **SQL Editor** in the left sidebar
5. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
6. Paste it into the SQL editor and click **Run**
7. Go to **Settings → API** and copy:
   - `Project URL` (looks like `https://xxxxx.supabase.co`)
   - `anon public` key (long string starting with `eyJ...`)

### Step 2: Create a GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it `steriletrack` (or anything you like)
3. Upload all these files to the repository (drag and drop works!)
4. Or use Git:
   ```bash
   git init
   git add .
   git commit -m "Initial SterileTrack commit"
   git remote add origin https://github.com/YOUR_USERNAME/steriletrack.git
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New Project** → **Import Git Repository**
3. Select your `steriletrack` GitHub repo
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = [your Supabase Project URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [your Supabase anon key]
   ```
5. Click **Deploy** — Vercel will build and deploy automatically!
6. Your app will be live at `https://steriletrack.vercel.app` (or similar)

### Step 4: Create Your First User

1. Go to your Supabase project → **Authentication → Users**
2. Click **Add User** → enter email and password for your first staff member
3. Then go to **Table Editor → profiles** and add a row:
   ```
   id: [copy the user's UUID from Authentication]
   full_name: Maria Santos
   role: cssd_supervisor
   department: CSSD
   employee_id: EMP001
   avatar_initials: MS
   ```
4. Repeat for each staff member

---

## 👤 User Roles

| Role | Description |
|------|-------------|
| `system_admin` | Full access to everything |
| `hospital_admin` | View all, manage users |
| `cssd_supervisor` | Full CSSD access |
| `cssd_technician` | Scan, update workflow |
| `or_nurse` | Request and receive items |
| `or_supervisor` | OR management |
| `infection_control` | View reports and audits |
| `materials_management` | Inventory management |
| `purchasing` | View inventory levels |

---

## 📱 How Staff Use the App

### Daily Workflow for CSSD Technicians:
1. Open the app on phone or tablet
2. Tap **Scan Item** in the sidebar
3. Scan or type the QR code on the item
4. Select the action (e.g. "Send to Decontamination")
5. Optionally add location and notes
6. Tap the action button — done! ✓

### For OR Nurses:
1. Go to **Inventory** to see available sterile items
2. Use **Scan** to confirm item received from CSSD
3. After surgery, scan item back as "Returned to CSSD"

---

## 🏷️ QR Code Setup

Each item needs a physical QR code label. You can generate QR codes for free at:
- [qr-code-generator.com](https://www.qr-code-generator.com)
- [goqr.me](https://goqr.me)

The QR code content should match the `qr_code` field in the database.

Example QR code values:
- `MAJOR-001` for Major Set 001
- `ORTHO-003` for Orthopedic Set 003
- `LAP-002` for Laparoscopy Set 002

Print on waterproof labels (Brady or similar) and attach to instrument set containers.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| QR Scanning | Native camera / barcode scanner |

---

## 📊 Database Tables

- `profiles` — Staff accounts and roles
- `inventory_items` — All tracked items
- `audit_logs` — Immutable chain of custody
- `sterilization_loads` — Autoclave cycle tracking
- `alerts` — System alerts and notifications

---

## 🔒 Security

- All data protected by Supabase Row Level Security (RLS)
- Audit logs cannot be edited or deleted
- Every action records the user, timestamp, and device
- HTTPS enforced by Vercel

---

## 📞 Support

Contact your CSSD Supervisor or IT department for access issues.
