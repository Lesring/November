-- November 的目录和认证结构。
-- dataset = demo 是演示数据，以后的真实数据用 dataset = live，两套编号互不覆盖。
-- 对象存储只记在 media_files：公开桶或私有桶、对象路径。页面上的链接在读取时拼出来。

DROP TABLE IF EXISTS inquiry_lines, inquiries, post_images, posts,
  work_marks, work_specs, work_images, works, collections,
  maker_steps, maker_paragraphs, maker_channels, badges, evidence, applications, makers,
  membership_perks, membership_tiers, program_standards, site_copy,
  certification_types, categories, media_files, datasets CASCADE;

DROP TABLE IF EXISTS messages, products, creators, certifications, settings CASCADE;

CREATE TABLE datasets (
  id text PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE categories (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id)
);

CREATE TABLE certification_types (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  label text NOT NULL,
  summary text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id)
);

CREATE TABLE media_files (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  bucket text NOT NULL,
  object_key text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('public', 'private')),
  content_type text NOT NULL,
  PRIMARY KEY (dataset, id),
  UNIQUE (dataset, object_key)
);

CREATE TABLE makers (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  name text NOT NULL,
  city text NOT NULL,
  craft text NOT NULL,
  years integer NOT NULL,
  avatar_id text NOT NULL,
  cover_id text NOT NULL,
  headline text NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, avatar_id) REFERENCES media_files (dataset, id),
  FOREIGN KEY (dataset, cover_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE maker_channels (
  dataset text NOT NULL,
  maker_id text NOT NULL,
  name text NOT NULL,
  label text NOT NULL,
  PRIMARY KEY (dataset, maker_id),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id) ON DELETE CASCADE
);

CREATE TABLE maker_paragraphs (
  dataset text NOT NULL,
  maker_id text NOT NULL,
  sort_order integer NOT NULL,
  body text NOT NULL,
  PRIMARY KEY (dataset, maker_id, sort_order),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id) ON DELETE CASCADE
);

CREATE TABLE maker_steps (
  dataset text NOT NULL,
  maker_id text NOT NULL,
  sort_order integer NOT NULL,
  media_id text NOT NULL,
  caption text NOT NULL,
  PRIMARY KEY (dataset, maker_id, sort_order),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id) ON DELETE CASCADE,
  FOREIGN KEY (dataset, media_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE works (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  maker_id text NOT NULL,
  category_id text NOT NULL,
  title text NOT NULL,
  price_yuan integer NOT NULL CHECK (price_yuan >= 0),
  summary text NOT NULL,
  description text NOT NULL,
  lead_time text NOT NULL,
  edition text NOT NULL,
  accepts_custom boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id),
  FOREIGN KEY (dataset, category_id) REFERENCES categories (dataset, id)
);

CREATE TABLE work_images (
  dataset text NOT NULL,
  work_id text NOT NULL,
  sort_order integer NOT NULL,
  media_id text NOT NULL,
  PRIMARY KEY (dataset, work_id, sort_order),
  FOREIGN KEY (dataset, work_id) REFERENCES works (dataset, id) ON DELETE CASCADE,
  FOREIGN KEY (dataset, media_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE work_specs (
  dataset text NOT NULL,
  work_id text NOT NULL,
  sort_order integer NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  PRIMARY KEY (dataset, work_id, sort_order),
  FOREIGN KEY (dataset, work_id) REFERENCES works (dataset, id) ON DELETE CASCADE
);

CREATE TABLE work_marks (
  dataset text NOT NULL,
  work_id text NOT NULL,
  certification_id text NOT NULL,
  detail text NOT NULL,
  PRIMARY KEY (dataset, work_id, certification_id),
  FOREIGN KEY (dataset, work_id) REFERENCES works (dataset, id) ON DELETE CASCADE,
  FOREIGN KEY (dataset, certification_id) REFERENCES certification_types (dataset, id)
);

CREATE TABLE collections (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  category_id text NOT NULL,
  media_id text NOT NULL,
  kicker text NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, category_id) REFERENCES categories (dataset, id),
  FOREIGN KEY (dataset, media_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE posts (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  maker_id text NOT NULL,
  work_id text,
  type text NOT NULL CHECK (type IN ('video', 'note')),
  title text NOT NULL,
  body text NOT NULL,
  poster_id text,
  duration text,
  likes integer NOT NULL DEFAULT 0 CHECK (likes >= 0),
  ratio text,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id),
  FOREIGN KEY (dataset, work_id) REFERENCES works (dataset, id),
  FOREIGN KEY (dataset, poster_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE post_images (
  dataset text NOT NULL,
  post_id text NOT NULL,
  sort_order integer NOT NULL,
  media_id text NOT NULL,
  PRIMARY KEY (dataset, post_id, sort_order),
  FOREIGN KEY (dataset, post_id) REFERENCES posts (dataset, id) ON DELETE CASCADE,
  FOREIGN KEY (dataset, media_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE inquiries (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  name text NOT NULL,
  avatar_id text,
  preview text NOT NULL,
  time_label text NOT NULL,
  unread boolean NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, avatar_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE inquiry_lines (
  dataset text NOT NULL,
  inquiry_id text NOT NULL,
  sort_order integer NOT NULL,
  sender text NOT NULL CHECK (sender IN ('me', 'them')),
  body text NOT NULL,
  PRIMARY KEY (dataset, inquiry_id, sort_order),
  FOREIGN KEY (dataset, inquiry_id) REFERENCES inquiries (dataset, id) ON DELETE CASCADE
);

CREATE TABLE applications (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  maker_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  note text NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id)
);

CREATE TABLE evidence (
  dataset text NOT NULL,
  id text NOT NULL,
  application_id text NOT NULL,
  media_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('photo', 'video')),
  caption text NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id),
  FOREIGN KEY (dataset, application_id) REFERENCES applications (dataset, id) ON DELETE CASCADE,
  FOREIGN KEY (dataset, media_id) REFERENCES media_files (dataset, id)
);

CREATE TABLE badges (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  maker_id text NOT NULL,
  application_id text NOT NULL,
  public_slug text NOT NULL,
  PRIMARY KEY (dataset, id),
  UNIQUE (dataset, public_slug),
  UNIQUE (dataset, maker_id),
  FOREIGN KEY (dataset, maker_id) REFERENCES makers (dataset, id),
  FOREIGN KEY (dataset, application_id) REFERENCES applications (dataset, id)
);

CREATE TABLE site_copy (
  dataset text PRIMARY KEY REFERENCES datasets (id),
  brand_name text NOT NULL,
  brand_name_zh text NOT NULL,
  tagline text NOT NULL,
  promise text NOT NULL,
  lede text NOT NULL,
  rights_title text NOT NULL,
  return_policy text NOT NULL,
  rights_body text NOT NULL,
  protection text NOT NULL,
  protection_note text NOT NULL,
  program_kicker text NOT NULL,
  program_headline text NOT NULL,
  program_intro text NOT NULL,
  badge_name text NOT NULL,
  badge_note text NOT NULL,
  apply_label text NOT NULL,
  apply_note text NOT NULL,
  membership_headline text NOT NULL,
  membership_intro text NOT NULL,
  membership_note text NOT NULL
);

CREATE TABLE program_standards (
  dataset text NOT NULL REFERENCES datasets (id),
  sort_order integer NOT NULL,
  body text NOT NULL,
  PRIMARY KEY (dataset, sort_order)
);

CREATE TABLE membership_tiers (
  dataset text NOT NULL REFERENCES datasets (id),
  id text NOT NULL,
  name text NOT NULL,
  price_label text NOT NULL,
  blurb text NOT NULL,
  recommended boolean NOT NULL,
  sort_order integer NOT NULL,
  PRIMARY KEY (dataset, id)
);

CREATE TABLE membership_perks (
  dataset text NOT NULL,
  tier_id text NOT NULL,
  sort_order integer NOT NULL,
  body text NOT NULL,
  PRIMARY KEY (dataset, tier_id, sort_order),
  FOREIGN KEY (dataset, tier_id) REFERENCES membership_tiers (dataset, id) ON DELETE CASCADE
);
