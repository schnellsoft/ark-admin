-- Article list-card snippet fields (title, text, date, library image).
ALTER TABLE articles ADD COLUMN snippet_title_ro TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_title_en TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_title_bg TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_text_ro TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_text_en TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_text_bg TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_date TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_library_id TEXT;
ALTER TABLE articles ADD COLUMN snippet_master_key TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN snippet_webp_key TEXT;
