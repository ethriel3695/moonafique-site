-- Private, normalized reference images. Never include bytes in the queue query.
CREATE TABLE customs.reference_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES customs.requests(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  data bytea NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 1048576),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 1600),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 1600),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, position)
);
