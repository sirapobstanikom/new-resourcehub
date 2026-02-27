# Deploy Edge Functions (แจ้งเมล + อนุมัติแอดมิน + ล็อกอินแอดมิน + ปฏิทิน)

รันตามลำดับในเทอร์มินัล (ที่โฟลเดอร์โปรเจกต์):

## 1. ล็อกอิน Supabase (ครั้งแรกเท่านั้น)
```bash
npx supabase login
```

## 2. ลิงก์โปรเจกต์
```bash
npx supabase link --project-ref axaasphuaaadzjoffznj
```

## 3. รัน schema ใน Supabase (ครั้งแรกเท่านั้น)
ใน Supabase Dashboard → SQL Editor → เปิด `supabase/schema.sql` แล้วรันส่วนตาราง `admin_signup_requests` และ `admin_users` (หรือรันทั้งไฟล์)

## 4. ตั้งค่า Secrets
ใน Supabase → Edge Functions → Secrets ใส่:
- **RESEND_API_KEY** = API key จาก resend.com (ให้ส่งเมลได้)
- (ถ้าต้องการ) **ADMIN_USERNAME** / **ADMIN_PASSWORD** = แอดมินหลักที่ใช้ล็อกอินได้โดยไม่ต้องอนุมัติ
- สำหรับปฏิทิน: **GOOGLE_CLIENT_ID**, **GOOGLE_CLIENT_SECRET** (ดู `supabase/GOOGLE-CALENDAR-OAUTH.md`)
- สำหรับ AI (Chat + แบบประเมินภาวะผู้นำ): **OPENAI_API_KEY** = API key ใหม่จาก [OpenAI API Keys](https://platform.openai.com/api-keys) (ห้ามใส่ในโค้ดหรือ .env ที่ commit ขึ้น Git — ใส่เฉพาะใน Supabase Secrets)

## 5. Deploy ฟังก์ชัน

### แอดมิน + เมล (ต้องมี)
```bash
npx supabase functions deploy notify-admin-signup --no-verify-jwt
npx supabase functions deploy approve-admin --no-verify-jwt
npx supabase functions deploy admin-login --no-verify-jwt
```

### ปฏิทิน (ถ้าใช้หน้าลางาน/ปฏิทิน)
```bash
npx supabase functions deploy get-calendar-events --no-verify-jwt
npx supabase functions deploy get-shared-calendar-events --no-verify-jwt
npx supabase functions deploy google-calendar-auth --no-verify-jwt
npx supabase functions deploy google-calendar-callback --no-verify-jwt
npx supabase functions deploy create-leave-calendar-event --no-verify-jwt
```

### AI (OpenAI proxy — ป้องกัน key หลุดตอน deploy)
```bash
npx supabase functions deploy openai-proxy --no-verify-jwt
```
จากนั้นใน Supabase → Edge Functions → Secrets ใส่ **OPENAI_API_KEY** = คีย์ใหม่จาก OpenAI (ห้ามใช้คีย์เก่าที่หลุดแล้ว)

หรือรันครั้งเดียว (แอดมิน + เมลเท่านั้น):
```bash
npm run supabase:deploy
```

**สำคัญ:** ต้องใส่ `--no-verify-jwt` ทุกตัว เพื่อให้เรียกจากเบราว์เซอร์ได้โดยไม่เกิด 401/403

---

## แก้ไข error `{"code":"NOT_FOUND","message":"Requested function was not found"}`

ข้อความนี้แปลว่า **ฟังก์ชันที่แอปเรียกยังไม่ได้ deploy** ไปที่โปรเจกต์ Supabase ที่ใช้อยู่ (หรือลิงก์คนละโปรเจกต์)

- ตรวจสอบว่า `VITE_SUPABASE_URL` ใน `.env` ชี้ไปที่โปรเจกต์เดียวกับที่รัน `npx supabase link` แล้ว deploy ฟังก์ชัน
- Deploy ฟังก์ชันที่แอปเรียก:
  - หน้าอนุมัติแอดมิน → `approve-admin`
  - หน้าลงทะเบียนแอดมิน → `notify-admin-signup`
  - หน้าแอดมินล็อกอิน → `admin-login`
  - หน้าลางาน/ปฏิทิน (โหลด events หรือเชื่อม Google) → `get-calendar-events`, `get-shared-calendar-events`, `google-calendar-auth`, `google-calendar-callback`
  - AI Chat / แบบประเมินภาวะผู้นำ (feedback) → `openai-proxy` + ใส่ **OPENAI_API_KEY** ใน Secrets
- หลัง deploy แล้ว ดูใน Supabase Dashboard → Edge Functions ว่ามีชื่อฟังก์ชันนั้นในรายการหรือไม่
