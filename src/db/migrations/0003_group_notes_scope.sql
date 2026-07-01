ALTER TABLE folders ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE folders ADD COLUMN created_by_user_id TEXT;
ALTER TABLE folders ADD COLUMN updated_by_user_id TEXT;
ALTER TABLE notes ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE notes ADD COLUMN created_by_user_id TEXT;
ALTER TABLE notes ADD COLUMN updated_by_user_id TEXT;

UPDATE folders SET scope = 'personal' WHERE scope IS NULL OR scope = '';
UPDATE notes SET scope = 'personal' WHERE scope IS NULL OR scope = '';
UPDATE folders SET created_by_user_id = owner_user_id WHERE created_by_user_id IS NULL;
UPDATE folders SET updated_by_user_id = owner_user_id WHERE updated_by_user_id IS NULL;
UPDATE notes SET created_by_user_id = owner_user_id WHERE created_by_user_id IS NULL;
UPDATE notes SET updated_by_user_id = owner_user_id WHERE updated_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS folders_scope_idx ON folders(scope);
CREATE INDEX IF NOT EXISTS notes_scope_idx ON notes(scope);
