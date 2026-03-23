# แจ้งอีเมลไปที่ phet@minddojo.me เมื่อมีผู้สมัครใหม่

## การตั้งค่า

1. **สร้าง API Key ที่ Resend**
   - ไปที่ [resend.com](https://resend.com) → สมัคร/ล็อกอิน → API Keys → Create API Key

2. **เพิ่ม Secret ใน Supabase**
   - ใน Supabase Dashboard: **Project Settings** → **Edge Functions** → **Secrets**
   - เพิ่ม `RESEND_API_KEY` = ค่า API key จาก Resend

3. **Deploy Edge Function**
   - ติดตั้ง Supabase CLI: `npm i -g supabase`
   - Login: `supabase login`
   - จากโฟลเดอร์โปรเจกต์: `supabase link` (เลือก project)
   - Deploy: `supabase functions deploy notify-admin-signup`

เมื่อมีผู้สมัครใหม่ ระบบจะส่งอีเมลไปที่ **phet@minddojo.me** ด้วยหัวข้อ "มีผู้สมัครใหม่ MindDoJo ResourceHub" และเนื้อหาอีเมลที่สมัคร แอดมินสามารถไปยืนยันผู้ใช้ได้ที่ Supabase Dashboard → Authentication → Users
