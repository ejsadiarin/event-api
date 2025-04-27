-- Organizations
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  org_logo VARCHAR(80),
  top_web_url VARCHAR(80),
  background_pub_url VARCHAR(80)
);

-- Events
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  title VARCHAR(50) NOT NULL,
  description VARCHAR(50),
  main_event_id INT,
  venue VARCHAR(125) NOT NULL,
  schedule DATETIME NOT NULL,
  is_free BOOLEAN DEFAULT TRUE,
  code VARCHAR(10) UNIQUE,
  registered_count INT DEFAULT 0,
  max_capacity INT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (main_event_id) REFERENCES events(id)
);

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(50) UNIQUE NOT NULL,
  display_picture VARCHAR(50),
  name VARCHAR(50) NOT NULL
);

-- Registrations
CREATE TABLE registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  pwd_type ENUM('TEXTLESS_VERTICAL', 'TEXTLESS_HORIZONTAL', 'WAIN'),
  pwd_data VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
