-- ถ้าเคยรัน migration เวอร์เก่าที่มี band_id / band_level_en / answers ให้ลบคอลัมน์เหล่านั้น
-- บน DB ใหม่ที่สร้างจาก 20260212140000 เวอร์ล่าสุดแล้ว จะไม่มีคอลัมน์เหล่านี้ — คำสั่งนี้จะไม่ทำอะไร (IF EXISTS)

alter table if exists public.reactive_proactive_mindset_results
  drop column if exists band_id,
  drop column if exists band_level_en,
  drop column if exists answers;
