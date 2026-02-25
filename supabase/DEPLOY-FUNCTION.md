# Deploy Edge Functions (แจ้งเมล + อนุมัติแอดมิน + ล็อกอินแอดมิน)

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

## 5. Deploy ฟังก์ชันทั้ง 3 ตัว
```bash
npx supabase functions deploy notify-admin-signup --no-verify-jwt
npx supabase functions deploy approve-admin --no-verify-jwt
npx supabase functions deploy admin-login --no-verify-jwt
```
หรือรันครั้งเดียว:
```bash
npm run supabase:deploy
```

**สำคัญ:** ต้องใส่ `--no-verify-jwt` ทุกตัว เพื่อให้เรียกจากเบราว์เซอร์ได้โดยไม่เกิด 401/403
