export const WEBSITE_FIELD_OPTION_DEFAULTS = {
  wordpress_version: ["Pending", "8.3", "8.2"],
  wp_users: ["1", "2", "3+"],
  wordpress_auto_updates: ["Enabled", "Disabled", "Unsure"],
  php_version: ["8.3", "8.2", "8.1", "8.0", "7.4", "Older than 7.4"],
  latest_theme: ["Yes", "No", "Unsure"],
  security_plugin: ["Wordfence", "Sucuri", "iThemes", "Solid Security", "None", "Unsure"],
  firewall: ["Yes", "No", "Unsure"],
  captcha_protection: ["Yes", "No", "Unsure"],
  xml_rpc_disabled: ["Yes", "No", "Unsure"],
  comments_pings: ["Disabled", "Enabled", "Unsure"],
  gdpr_banner: ["Yes", "No", "Unsure"],
  external_link_security: ["Yes", "No", "Unsure"],
  uptime_robot: ["Yes", "No", "Unsure"],
  email_server_unblocked: ["Yes", "No", "Unsure"],
  caching_plugin: ["WP Rocket", "W3 Total Cache", "LiteSpeed Cache", "WP Fastest Cache", "None", "Unsure"],
  image_compression: ["Yes", "No", "Unsure"],
  seo_plugin: ["Rank Math", "Yoast", "AIOSEO", "SEOPress", "None", "Unsure"],
  publish_dates_removed: ["Yes", "No", "Unsure"],
  misc_links_nofollow: ["Yes", "No", "Unsure"],
  social_links_nofollow: ["Yes", "No", "Unsure"],
  amazon_links_nofollow: ["Yes", "No", "N/A", "Unsure"],
  obsolete_plugins: ["Cleared", "Some remain", "Other"],
  theme_plugins_status: ["Up to date", "Needs updates", "Unsure"],
  search_console_status: ["OK", "Errors present", "Not connected", "Unsure"],
  ppc_enabled: ["Enabled", "Pending"],
  hosting_provider: ["SiteGround", "Kinsta", "WP Engine", "Cloudways", "Bluehost", "Hostinger", "Other"],
} satisfies Record<string, string[]>;

export type WebsiteFieldOptionKey = keyof typeof WEBSITE_FIELD_OPTION_DEFAULTS;

export const WEBSITE_FIELD_OPTION_KEYS = Object.keys(
  WEBSITE_FIELD_OPTION_DEFAULTS,
) as WebsiteFieldOptionKey[];
