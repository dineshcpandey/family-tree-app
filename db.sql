-- database_setup.sql
-- Run this script to create the database schema and add sample data

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS network;

-- Create person table
CREATE TABLE IF NOT EXISTS network.person (
  id INT4 NOT NULL PRIMARY KEY,
  name VARCHAR NULL,
  birthdate DATE NULL,
  fatherid INT4 NULL,
  motherid INT4 NULL,
  spouseid INT4 NULL,
  gender VARCHAR NULL,
  currentlocation VARCHAR NULL
);

-- Add foreign key constraints
ALTER TABLE network.person
  ADD CONSTRAINT fk_father FOREIGN KEY (fatherid) REFERENCES network.person(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_mother FOREIGN KEY (motherid) REFERENCES network.person(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_spouse FOREIGN KEY (spouseid) REFERENCES network.person(id) ON DELETE SET NULL;

-- Insert sample data
INSERT INTO network.person (id, name, birthdate, fatherid, motherid, spouseid, gender, currentlocation)
VALUES
  (1, 'John Smith', '1975-05-15', 3, 4, 2, 'Male', 'New York'),
  (2, 'Mary Smith', '1978-09-21', 5, 6, 1, 'Female', 'New York'),
  (3, 'Robert Smith', '1945-03-10', NULL, NULL, 4, 'Male', 'Chicago'),
  (4, 'Jennifer Smith', '1948-12-03', NULL, NULL, 3, 'Female', 'Chicago'),
  (5, 'Michael Johnson', '1950-06-20', NULL, NULL, 6, 'Male', 'Boston'),
  (6, 'Sarah Johnson', '1952-08-15', NULL, NULL, 5, 'Female', 'Boston'),
  (7, 'David Smith', '2005-04-12', 1, 2, NULL, 'Male', 'New York'),
  (8, 'Lisa Smith', '2008-07-18', 1, 2, NULL, 'Female', 'New York'),
  (9, 'Emma Johnson', '1980-11-25', 5, 6, 10, 'Female', 'Los Angeles'),
  (10, 'Daniel Wilson', '1979-02-14', NULL, NULL, 9, 'Male', 'Los Angeles');

-- Create a sequence for ID generation
CREATE SEQUENCE IF NOT EXISTS network.person_id_seq
  START WITH 11
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Create function to get next ID
CREATE OR REPLACE FUNCTION network.get_next_person_id()
RETURNS INT AS $$
BEGIN
  RETURN nextval('network.person_id_seq');
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_person_name ON network.person(name);
CREATE INDEX IF NOT EXISTS idx_person_location ON network.person(currentlocation);
CREATE INDEX IF NOT EXISTS idx_person_father ON network.person(fatherid);
CREATE INDEX IF NOT EXISTS idx_person_mother ON network.person(motherid);
CREATE INDEX IF NOT EXISTS idx_person_spouse ON network.person(spouseid);