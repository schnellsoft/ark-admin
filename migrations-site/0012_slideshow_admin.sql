-- Slideshow admin: title/enabled/filters + expanded settings
ALTER TABLE slideshow_slides ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE slideshow_slides ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE slideshow_slides ADD COLUMN filters_json TEXT NOT NULL DEFAULT '';

ALTER TABLE slideshow_settings ADD COLUMN animation_duration INTEGER NOT NULL DEFAULT 780;
ALTER TABLE slideshow_settings ADD COLUMN kenburns INTEGER NOT NULL DEFAULT 1;
ALTER TABLE slideshow_settings ADD COLUMN swipe_threshold INTEGER NOT NULL DEFAULT 48;
ALTER TABLE slideshow_settings ADD COLUMN output_json TEXT NOT NULL DEFAULT '';
