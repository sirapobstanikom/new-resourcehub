# Deploy Edge Function notify-admin-signup

รันตามลำดับในเทอร์มินัล (ที่โฟลเดอร์โปรเจกต์):

## 1. ล็อกอิน Supabase (ครั้งแรกเท่านั้น)
```bash
npx supabase login
```
จะเปิดเบราว์เซอร์ → เลือกบัญชี/ล็อกอิน Supabase ให้เสร็จ

## 2. ลิงก์โปรเจกต์
```bash
npx supabase link --project-ref axaasphuaaadzjoffznj
```
ถ้าถามว่าใช้ password หรือไม่ ให้กด Enter (ใช้ token จาก login)

## 3. Deploy ฟังก์ชัน
```bash
npx supabase functions deploy notify-admin-signup --no-verify-jwt
```
**สำคัญ:** ต้องใส่ `--no-verify-jwt` เพื่อให้หน้า admin สมัคร (ที่ยังไม่ได้ล็อกอิน) เรียกฟังก์ชันได้ ไม่เกิด 401

หรือใช้สคริปต์จาก package.json (หลัง login แล้ว):
```bash
npm run supabase:link
npm run supabase:deploy
```
