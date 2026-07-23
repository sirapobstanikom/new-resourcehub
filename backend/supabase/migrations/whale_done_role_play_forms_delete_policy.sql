-- เพิ่มสิทธิ์ลบ (รันถ้าสร้างตารางไปแล้ว)
-- Run in Supabase → SQL Editor

drop policy if exists "Allow delete whale_done_conflict_canvas_responses" on public.whale_done_conflict_canvas_responses;
create policy "Allow delete whale_done_conflict_canvas_responses"
  on public.whale_done_conflict_canvas_responses
  for delete
  using (true);

drop policy if exists "Allow delete whale_done_accountability_commitments" on public.whale_done_accountability_commitments;
create policy "Allow delete whale_done_accountability_commitments"
  on public.whale_done_accountability_commitments
  for delete
  using (true);
