UPDATE notes
SET folder_id = NULL
WHERE folder_id IN (
  SELECT id FROM folders
  WHERE scope = 'personal'
    AND name = 'Inbox'
    AND parent_folder_id IS NULL
);

UPDATE folders
SET parent_folder_id = NULL
WHERE parent_folder_id IN (
  SELECT id FROM folders
  WHERE scope = 'personal'
    AND name = 'Inbox'
    AND parent_folder_id IS NULL
);

DELETE FROM folders
WHERE scope = 'personal'
  AND name = 'Inbox'
  AND parent_folder_id IS NULL;
