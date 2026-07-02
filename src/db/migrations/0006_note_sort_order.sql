ALTER TABLE notes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS notes_folder_sort_order_idx ON notes(scope, owner_user_id, folder_id, deleted_at, sort_order);

UPDATE notes
SET sort_order = (
  SELECT COUNT(*) * 10
  FROM notes AS ranked
  WHERE ranked.deleted_at IS NULL
    AND ranked.scope = notes.scope
    AND ranked.owner_user_id = notes.owner_user_id
    AND COALESCE(ranked.folder_id, '') = COALESCE(notes.folder_id, '')
    AND (
      ranked.pinned > notes.pinned
      OR (ranked.pinned = notes.pinned AND ranked.updated_at > notes.updated_at)
      OR (ranked.pinned = notes.pinned AND ranked.updated_at = notes.updated_at AND ranked.title < notes.title)
      OR (ranked.pinned = notes.pinned AND ranked.updated_at = notes.updated_at AND ranked.title = notes.title AND ranked.id <= notes.id)
    )
)
WHERE deleted_at IS NULL;
