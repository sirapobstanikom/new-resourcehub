-- Ensure legacy columns are removed from reactive_proactive_mindset_results.
-- Columns removed: answers, band_level_en, band_id

alter table if exists public.reactive_proactive_mindset_results
  drop column if exists answers,
  drop column if exists band_level_en,
  drop column if exists band_id;
