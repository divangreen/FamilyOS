-- Add new sub-village categories requested in product feedback
INSERT INTO sub_villages (name, description) VALUES
  ('Pregnancy',            'Questions and support for expectant parents'),
  ('Education',            'School choices, learning, and academic development'),
  ('Social & Development', 'Social skills, milestones, and behavioural guidance')
ON CONFLICT (name) DO NOTHING;
