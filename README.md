# MindDoJo Resource Hub

โครงสร้างโปรเจกต์แยกเป็น:

| โฟลเดอร์ | คำอธิบาย |
|-----------|----------|
| **`frontend/`** | แอป Vite + React (UI) |
| **`backend/`** | Supabase Edge Functions (`backend/supabase/`) |

## ติดตั้งและรัน frontend

```bash
npm install
npm run dev
```

เปิดที่ `http://localhost:3000` (ตามที่ตั้งใน `frontend/vite.config.ts`)

## Build

```bash
npm run build
```

ผลลัพธ์อยู่ที่ `frontend/dist`

## Supabase (Edge Functions)

จากรากโปรเจกต์:

```bash
npm run supabase:link
npm run supabase:deploy
```

รายละเอียดเพิ่มเติมดูที่ `backend/README.md`

## หมายเหตุ

- ไฟล์ `.env` แนะนำวางที่ **ราก repo** (ตั้งค่าใน `frontend/vite.config.ts` แล้ว) — ดู `frontend/README.md` ถ้าต้องการใช้เฉพาะ `frontend/.env`
- สคริปต์ `scripts/fix-image-urls.cjs` อ้างอิง `frontend/constants.tsx`
