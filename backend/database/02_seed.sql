-- Create a test user (password is 'password123')
INSERT INTO users (id, username, password_hash)
VALUES ('00000000-0000-4000-a000-000000000000', 'testuser', '$2b$10$kULg57wGvZHU//Sgd405BO9JO1Vzfe6V3IfNlv1rDkyKLVEcr.cxS')
ON CONFLICT DO NOTHING;

-- Create a test project
INSERT INTO projects (id, name)
VALUES ('11111111-1111-4000-a000-000000000000', 'Test Project')
ON CONFLICT DO NOTHING;

-- Link user to project
INSERT INTO project_members (project_id, user_id, role)
VALUES ('11111111-1111-4000-a000-000000000000', '00000000-0000-4000-a000-000000000000', 'owner')
ON CONFLICT DO NOTHING;

-- Create a board
INSERT INTO boards (id, name, project_id)
VALUES ('22222222-2222-4000-a000-000000000000', 'Development Board', '11111111-1111-4000-a000-000000000000')
ON CONFLICT DO NOTHING;

-- Create columns
INSERT INTO columns (id, title, board_id, project_id, order_index)
VALUES 
  ('33333333-3333-4000-a000-000000000001', 'To Do', '22222222-2222-4000-a000-000000000000', '11111111-1111-4000-a000-000000000000', 0),
  ('33333333-3333-4000-a000-000000000002', 'Done', '22222222-2222-4000-a000-000000000000', '11111111-1111-4000-a000-000000000000', 1);

-- Create a task
INSERT INTO tasks (title, description, column_id, project_id, order_index)
VALUES ('Fix Login Bug', 'The cookie is not setting correctly', '33333333-3333-4000-a000-000000000001', '11111111-1111-4000-a000-000000000000', 0);