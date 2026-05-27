CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  lead_id UUID,
  lead_name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'message',
  title VARCHAR(255) NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_access ON notifications;
CREATE POLICY company_access ON notifications FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
