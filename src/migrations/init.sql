-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  org_logo VARCHAR(255),
  top_web_url VARCHAR(255),
  background_pub_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  title VARCHAR(50) NOT NULL,
  description TEXT,
  venue VARCHAR(125) NOT NULL,
  schedule DATETIME NOT NULL,
  is_free BOOLEAN DEFAULT TRUE,
  code VARCHAR(10) UNIQUE,
  registered_count INT DEFAULT 0,
  max_capacity INT NOT NULL,
  available_slots INT GENERATED ALWAYS AS (max_capacity - registered_count) STORED, -- generated columns for mysql versions (5.7+) or mariadb 10.2+
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Create users table with authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(50) UNIQUE,
  display_picture VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  pwd_type ENUM('TEXTLESS_VERTICAL', 'TEXTLESS_HORIZONTAL', 'WAIN'),
  pwd_data VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
