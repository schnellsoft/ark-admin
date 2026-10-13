-- Desktop crop + focal point for slideshow slides
ALTER TABLE slideshow_slides ADD COLUMN desktop_crop_json TEXT NOT NULL DEFAULT '';
ALTER TABLE slideshow_slides ADD COLUMN desktop_focus_json TEXT NOT NULL DEFAULT '';
