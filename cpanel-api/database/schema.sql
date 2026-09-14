CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(120) NOT NULL,
  `value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS websites (
  id CHAR(36) NOT NULL,
  category VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  url_key VARCHAR(255) NOT NULL,
  importance VARCHAR(24) NOT NULL DEFAULT 'medium',
  importance_score INT NOT NULL DEFAULT 5,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  hosting_provider TEXT NULL,
  server_label TEXT NULL,
  website_type TEXT NULL,
  address TEXT NULL,
  associated_email TEXT NULL,
  ppc_enabled TEXT NULL,
  notes TEXT NULL,
  notes_from_laraib TEXT NULL,
  date_added DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  last_reviewed_date DATE NULL,
  next_review_date DATE NULL,
  last_check_status VARCHAR(80) NULL,
  uses_wordpress TINYINT(1) NOT NULL DEFAULT 1,
  wordpress_login_url TEXT NULL,
  wordpress_admin_email TEXT NULL,
  wordpress_version TEXT NULL,
  wp_users TEXT NULL,
  wordpress_auto_updates TEXT NULL,
  xml_rpc_disabled TEXT NULL,
  php_version TEXT NULL,
  theme_plugins_status TEXT NULL,
  theme_plugins_status_other TEXT NULL,
  theme_plugins_checked_at DATE NULL,
  security_plugin TEXT NULL,
  security_plugin_other TEXT NULL,
  comments_pings TEXT NULL,
  comments_pings_other TEXT NULL,
  firewall TEXT NULL,
  firewall_other TEXT NULL,
  caching_plugin TEXT NULL,
  caching_plugin_other TEXT NULL,
  image_compression TEXT NULL,
  image_compression_other TEXT NULL,
  gdpr_banner TEXT NULL,
  gdpr_banner_other TEXT NULL,
  external_link_security TEXT NULL,
  external_link_security_other TEXT NULL,
  captcha_protection TEXT NULL,
  captcha_protection_other TEXT NULL,
  obsolete_plugins TEXT NULL,
  obsolete_plugins_other TEXT NULL,
  obsolete_plugins_checked_at DATE NULL,
  seo_plugin TEXT NULL,
  seo_plugin_other TEXT NULL,
  publish_dates_removed TEXT NULL,
  publish_dates_removed_other TEXT NULL,
  search_console_status TEXT NULL,
  search_console_checked_at DATE NULL,
  misc_links_nofollow TEXT NULL,
  misc_links_nofollow_other TEXT NULL,
  social_links_nofollow TEXT NULL,
  social_links_nofollow_other TEXT NULL,
  amazon_links_nofollow TEXT NULL,
  amazon_links_nofollow_other TEXT NULL,
  extra_fields LONGTEXT NOT NULL DEFAULT '{}',
  import_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY websites_url_key_unique (url_key),
  KEY websites_category_idx (category),
  KEY websites_status_idx (status),
  KEY websites_importance_idx (importance),
  CONSTRAINT websites_importance_score_range CHECK (importance_score BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS credentials (
  id CHAR(36) NOT NULL,
  website_id CHAR(36) NULL,
  kind VARCHAR(32) NOT NULL,
  label TEXT NULL,
  login_url TEXT NULL,
  username TEXT NULL,
  password_encrypted LONGTEXT NULL,
  phone TEXT NULL,
  recovery_email TEXT NULL,
  two_factor TEXT NULL,
  notes TEXT NULL,
  extra LONGTEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY credentials_website_idx (website_id),
  KEY credentials_kind_idx (kind),
  CONSTRAINT credentials_website_fk FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS general_credentials (
  id CHAR(36) NOT NULL,
  section TEXT NOT NULL,
  site TEXT NOT NULL,
  url TEXT NULL,
  username TEXT NULL,
  password_encrypted LONGTEXT NULL,
  backup_username TEXT NULL,
  backup_password_encrypted LONGTEXT NULL,
  notes TEXT NULL,
  extra LONGTEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY general_credentials_section_idx (section(120))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS premium_domains (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  notes TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  cpanel_login_url TEXT NULL,
  cpanel_username TEXT NULL,
  cpanel_password_encrypted LONGTEXT NULL,
  cpanel_access_state VARCHAR(32) NOT NULL DEFAULT 'not_given',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY premium_domains_active_idx (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spreadsheets (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  url TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) NOT NULL,
  action VARCHAR(120) NOT NULL,
  website_id CHAR(36) NULL,
  credential_id CHAR(36) NULL,
  summary TEXT NULL,
  meta LONGTEXT NOT NULL DEFAULT '{}',
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY audit_log_website_idx (website_id),
  KEY audit_log_created_idx (created_at),
  CONSTRAINT audit_log_website_fk FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL,
  CONSTRAINT audit_log_credential_fk FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminders (
  id CHAR(36) NOT NULL,
  website_id CHAR(36) NULL,
  kind VARCHAR(120) NOT NULL,
  label TEXT NULL,
  due_date DATE NULL,
  frequency_days INT NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY reminders_due_idx (due_date),
  CONSTRAINT reminders_website_fk FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_fields (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  section VARCHAR(255) NOT NULL,
  description TEXT NULL,
  field_type VARCHAR(80) NOT NULL,
  options LONGTEXT NOT NULL DEFAULT '[]',
  required TINYINT(1) NOT NULL DEFAULT 0,
  reminder_frequency_days INT NULL,
  color_rules LONGTEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  scope VARCHAR(80) NOT NULL DEFAULT 'all',
  archived TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_field_values (
  id CHAR(36) NOT NULL,
  custom_field_id CHAR(36) NOT NULL,
  website_id CHAR(36) NOT NULL,
  value LONGTEXT NULL,
  checked_at DATE NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY custom_field_values_unique (custom_field_id, website_id),
  CONSTRAINT custom_field_values_field_fk FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
  CONSTRAINT custom_field_values_website_fk FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (`key`, `value`) VALUES
  ('recommended_php_version', '"8.3"'),
  ('inactivity_timeout_minutes', '30'),
  ('reveal_conceal_seconds', '20'),
  ('website_field_options', '{"wordpress_version":["Pending","8.3","8.2"],"wp_users":["1","2","3+"],"wordpress_auto_updates":["Enabled","Disabled","Unsure"],"php_version":["8.3","8.2","8.1","8.0","7.4","Older than 7.4"],"latest_theme":["Yes","No","Unsure"],"security_plugin":["Wordfence","Sucuri","iThemes","Solid Security","None","Unsure"],"firewall":["Yes","No","Unsure"],"captcha_protection":["Yes","No","Unsure"],"xml_rpc_disabled":["Yes","No","Unsure"],"comments_pings":["Disabled","Enabled","Unsure"],"gdpr_banner":["Yes","No","Unsure"],"external_link_security":["Yes","No","Unsure"],"uptime_robot":["Yes","No","Unsure"],"email_server_unblocked":["Yes","No","Unsure"],"caching_plugin":["WP Rocket","W3 Total Cache","LiteSpeed Cache","WP Fastest Cache","None","Unsure"],"image_compression":["Yes","No","Unsure"],"seo_plugin":["Rank Math","Yoast","AIOSEO","SEOPress","None","Unsure"],"publish_dates_removed":["Yes","No","Unsure"],"misc_links_nofollow":["Yes","No","Unsure"],"social_links_nofollow":["Yes","No","Unsure"],"amazon_links_nofollow":["Yes","No","N/A","Unsure"],"obsolete_plugins":["Cleared","Some remain","Other"],"theme_plugins_status":["Up to date","Needs updates","Unsure"],"search_console_status":["OK","Errors present","Not connected","Unsure"],"ppc_enabled":["Enabled","Pending"],"hosting_provider":["SiteGround","Kinsta","WP Engine","Cloudways","Bluehost","Hostinger","Other"]}');
