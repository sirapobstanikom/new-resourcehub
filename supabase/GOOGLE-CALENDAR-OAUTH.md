# ตารางงานของฉัน — Google Calendar OAuth

ระบบใช้ OAuth 2.0 (ไม่ใช้ embed) เพื่อให้ผู้ใช้เชื่อมต่อ Google Calendar แล้วดึง events มาแสดงในหน้า "ตารางงานของฉัน"

## 1. ตั้งค่า Google Cloud

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/) → สร้างโปรเจกต์หรือเลือกโปรเจกต์
2. เปิด **APIs & Services** → **Library** → ค้นหา **Google Calendar API** → Enable
3. ไปที่ **Credentials** → **Create Credentials** → **OAuth client ID**
4. ถ้ายังไม่มี OAuth consent screen ให้สร้าง (แบบ External) และเพิ่ม scope `https://www.googleapis.com/auth/calendar.readonly`
5. เลือก Application type: **Web application**
6. ตั้งชื่อแล้วเพิ่ม **Authorized redirect URIs**:
   - `https://<PROJECT_REF>.supabase.co/functions/v1/google-calendar-callback`
   - แทน `<PROJECT_REF>` ด้วย Supabase Project Ref (ดูจาก Project Settings → General)
7. กด Create แล้ว copy **Client ID** และ **Client secret**

## 2. ตั้งค่า Supabase Secrets

ใน Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets** (หรือ **Edge Functions** → เลือกฟังก์ชัน → **Secrets**) เพิ่ม:

- `GOOGLE_CLIENT_ID` = Client ID จากขั้นตอนที่ 1
- `GOOGLE_CLIENT_SECRET` = Client secret จากขั้นตอนที่ 1
- (ถ้าใช้) `SUPABASE_ANON_KEY` = Anon key ของโปรเจกต์ (ใช้ใน get-calendar-events เพื่อตรวจสอบ session)

**หมายเหตุ:** `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` มักถูก inject ให้อัตโนมัติโดย Supabase สำหรับ Edge Functions ถ้าไม่มี ฟังก์ชันจะใช้ URL จาก request แทน (เฉพาะ SUPABASE_URL)

## 3. อัปเดต Database

**ถ้าตาราง `user_calendar_settings` ยังไม่มี** (เกิด error `db_failed` หรือ `42P01`) ให้รันใน Supabase Dashboard → **SQL Editor**:

```sql
-- สร้างตารางเก็บ OAuth tokens ของ Google Calendar
create table if not exists public.user_calendar_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text,
  access_token text,
  token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_calendar_settings enable row level security;

drop policy if exists "Allow read own calendar_settings" on public.user_calendar_settings;
create policy "Allow read own calendar_settings"
  on public.user_calendar_settings for select using (auth.uid() = user_id);

drop policy if exists "Allow insert own calendar_settings" on public.user_calendar_settings;
create policy "Allow insert own calendar_settings"
  on public.user_calendar_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Allow update own calendar_settings" on public.user_calendar_settings;
create policy "Allow update own calendar_settings"
  on public.user_calendar_settings for update using (auth.uid() = user_id);
```

(Edge Function ใช้ service role จึง bypass RLS ได้ ไม่ต้องเพิ่ม policy สำหรับ service role)

ถ้าตารางมีอยู่แล้วแต่มีแค่ `calendar_embed_url` ให้รัน:


```sql
alter table public.user_calendar_settings drop column if exists calendar_embed_url;
alter table public.user_calendar_settings add column if not exists refresh_token text;
alter table public.user_calendar_settings add column if not exists access_token text;
alter table public.user_calendar_settings add column if not exists token_expires_at timestamptz;
```

ถ้ารัน schema ใหม่ทั้งหมดจะได้ตารางที่มี `refresh_token`, `access_token`, `token_expires_at` อยู่แล้ว

## 4. Deploy Edge Functions

จากโฟลเดอร์โปรเจกต์:

```bash
# Auth + Callback ต้องไม่ verify JWT (เพราะผู้ใช้ถูก redirect มาจาก Google)
npx supabase functions deploy google-calendar-auth --no-verify-jwt
npx supabase functions deploy google-calendar-callback --no-verify-jwt

# get-calendar-events รับ Authorization: Bearer <session> จากแอป จึงไม่ต้องปิด verify (หรือใช้ default)
npx supabase functions deploy get-calendar-events
```

## 5. การทำงาน

- ผู้ใช้กด **เชื่อมต่อ Google Calendar** → ไปที่ Google OAuth → อนุญาต → กลับมาหน้า `/admin/leave?calendar=connected`
- Callback บันทึก `refresh_token` ลง `user_calendar_settings`
- หน้าแอปเรียก `get-calendar-events` พร้อม `Authorization: Bearer <session.access_token>` เพื่อดึง events จาก Calendar API มาแสดง

---

# ส่งการลาลง Calendar (Service Account — ปฏิทิน Admin & Production & Marketing)

เมื่อ user กดส่งคำขอลา ระบบจะสร้างอีเวนต์ใน Google Calendar ที่ phet@minddojo.me แชร์ (ในนาม Admin & Production & Marketing) โดยใช้ **Service Account**

## 1. เก็บไฟล์ JSON ใน Supabase Secrets

1. เปิดไฟล์ JSON ที่ดาวน์โหลดจาก Service Account (minddojo-calendar-bot)
2. คัดลอก **เนื้อทั้งหมด** ในไฟล์ (ทั้งก้อน JSON รวม `{ "type", "project_id", "private_key_id", "private_key", "client_email", ... }`)
3. ไปที่ Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
4. เพิ่ม Secret ใหม่:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** วางเนื้อ JSON ทั้งก้อน (ถ้า Supabase รับหลายบรรทัดได้ ให้วางได้เลย ไม่ต้องรวมเป็นบรรทัดเดียว)

ถ้า Supabase รับค่าได้แค่บรรทัดเดียว ให้รวม JSON เป็นหนึ่งบรรทัด (ลบ newline ใน `private_key` ออกหรือใช้ `\n` ตามรูปแบบ JSON)

## 2. ตั้งค่า Calendar ID

1. ให้ **phet@minddojo.me** เปิด Google Calendar → เลือกปฏิทิน **Admin & Production & Marketing**
2. ไปที่ **การตั้งค่าปฏิทิน** (Settings and sharing) → หา **Integrate calendar** → คัดลอก **Calendar ID** (รูปแบบเช่น `xxxxx@group.calendar.google.com`)
3. ใน Supabase → **Secrets** เพิ่ม:
   - **Name:** `GOOGLE_CALENDAR_ID`
   - **Value:** Calendar ID ที่คัดลอก

## 3. แชร์ปฏิทินกับ Service Account

ใน Google Calendar (บัญชี phet@minddojo.me) → การตั้งค่าปฏิทิน Admin & Production & Marketing → **Share with specific people** → Add people → ใส่อีเมลของ Service Account (จากในไฟล์ JSON ฟิลด์ `client_email` เช่น `minddojo-calendar-bot@xxx.iam.gserviceaccount.com`) → สิทธิ์ **Make changes to events** → Save

## 4. Deploy ฟังก์ชัน

```bash
npx supabase functions deploy create-leave-calendar-event
```

ฟังก์ชันนี้รับ `Authorization: Bearer <session>` จากแอป จึงไม่ต้องใช้ `--no-verify-jwt`

**ดึงปฏิทินรวม (อ่านอย่างเดียว — ใช้สิทธิ์ See only ได้)**

```bash
npx supabase functions deploy get-shared-calendar-events
```

ฟังก์ชัน `get-shared-calendar-events` ใช้ Service Account + scope `calendar.readonly` เพื่อ**อ่าน**อีเวนต์จากปฏิทิน Admin & Production & Marketing ได้แม้แชร์ด้วยสิทธิ์ **See only** (ไม่ต้อง Make changes to events) ในหน้า "ใครลาบ้าง" จะมีบล็อก "จากปฏิทินรวม" แสดงอีเวนต์จากปฏิทินนี้

**ตอนนี้ยังไม่ส่งการลาลง Calendar** — หลังส่งคำขอลาจะบันทึกแค่ใน DB ไม่เรียก `create-leave-calendar-event` จนกว่าจะได้สิทธิ์ Make changes to events

## 5. การทำงาน

เมื่อ user กด **ส่งคำขอลา** ระบบจะบันทึกลง `leave_requests` แล้วเรียก `create-leave-calendar-event` โดยส่งชื่อ, ประเภทลา, วันที่, เหตุผล ฟังก์ชันจะใช้ Service Account สร้างอีเวนต์ในปฏิทินที่ตั้งไว้ (โพสในนาม Admin & Production & Marketing)
