CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT    PRIMARY KEY,
  student_id TEXT    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL CHECK (type IN ('placement','result','event','general')),
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  priority   INTEGER NOT NULL DEFAULT 0,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  read_at    DATETIME,
  metadata   TEXT    DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notif_student_unread_time ON notifications (student_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_student_type_time ON notifications (student_id, type, created_at DESC);
