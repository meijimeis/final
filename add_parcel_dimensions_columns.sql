ALTER TABLE public.parcel_lists
  ADD COLUMN IF NOT EXISTS width_cm double precision CHECK (width_cm IS NULL OR width_cm >= 0),
  ADD COLUMN IF NOT EXISTS height_cm double precision CHECK (height_cm IS NULL OR height_cm >= 0);
