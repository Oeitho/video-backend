CREATE TABLE IF NOT EXISTS author (
	id     SERIAL PRIMARY KEY,
	secret VARCHAR(100) NOT NULL,
	name   VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS message (
	id           SERIAL PRIMARY KEY,
	user_id      INTEGER NOT NULL,
	chat_message VARCHAR(512),
	CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES author(id)
);