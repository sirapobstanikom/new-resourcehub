# Frontend (Vite + React)

แอปหลักของ MindDoJo Resource Hub

## รันจากรากโปรเจกต์

```bash
npm install   # ที่ราก repo (ใช้ npm workspaces)
npm run dev
```

หรือรันเฉพาะ workspace นี้:

```bash
npm run dev -w frontend
```

ไฟล์ `.env` วางที่ **รากโปรเจกต์** ได้ตามเดิม (`envDir` ใน `vite.config.ts` ชี้ไปที่โฟลเดอร์ด้านบน) ถ้าต้องการใช้เฉพาะ `frontend/.env` ให้เปลี่ยน `envDir` เป็น `path.resolve(__dirname, '.')` ใน `vite.config.ts`
