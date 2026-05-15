-- หัวข้อใหญ่บนแบบประเมิน Eva (แสดงก่อนชื่อแบบประเมินได้)
ALTER TABLE public.eva_editor_templates
  ADD COLUMN IF NOT EXISTS heading text NOT NULL DEFAULT '';
