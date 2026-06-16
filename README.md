# 🏥 SterileTrack — CSSD Management v3

Cloud-based CSSD management with **2-checkpoint workflow**: Receiving and Dispensing.

## Workflow

```
OR Nurse pre-cleans → CSSD Receiving Area
  ↓
  1. Scan QR + check completeness against editable list
  2. Inspect functionality/cleanliness + add remarks
  3. Pack for sterilization
  4. Sterilize + verify sterilization tape
  5. Place on labeled shelf
  ↓
Storage Shelf (ready)
  ↓
CSSD Dispensing Area
  1. Find sterile set + click Dispense
  2. Scan receiving staff QR badge
  3. Select OR Room + add remarks
  4. Print contents list for OR Nurse
  5. Confirm — chain of custody complete
```

## Deploy

1. **Run migration 002** in Supabase SQL Editor (file `supabase/migrations/002_receiving_dispensing_workflow.sql`)
2. Push updated files to GitHub — Vercel auto-deploys
3. Go to **Staff Directory** in the app to assign QR codes (e.g. `STAFF-001`) to each user
4. Go to **Instrument Sets** to edit the list of instruments per set

## Features

- **Editable instrument lists** per set (used at receiving + printed at dispensing)
- **Printable contents list** with signature lines for OR Nurse
- **Staff QR codes** for accountability at dispensing
- **3-step receiving** with progress indicator
- **Inspection records** stored separately for audit
- **Complete chain of custody** in audit log
