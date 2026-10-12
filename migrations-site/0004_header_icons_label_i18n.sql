-- Convert legacy plain-string header_icons.label values into LocaleMap JSON.
-- Already-JSON labels are left unchanged. Column type stays TEXT.

UPDATE header_icons
SET label = json_object('ro', label, 'bg', label, 'en', label),
    updated_at = datetime('now')
WHERE trim(label) != ''
  AND json_valid(label) = 0;
