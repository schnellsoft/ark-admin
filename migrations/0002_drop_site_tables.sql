-- Drop site tables from ark-admin-db if they were created earlier. Users/sessions remain.
DROP TABLE IF EXISTS geo_events;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS publish_log;
DROP TABLE IF EXISTS content_drafts;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS messages;
