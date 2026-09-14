# MariaDB API deployment

## Architecture

The Vercel application no longer connects to MariaDB directly.

Vercel calls the private SiteGuard PHP API over HTTPS. The PHP API connects to MariaDB locally on the cPanel server. MariaDB can therefore remain closed to remote Vercel connections.

The cPanel server stores:

* MariaDB host, database name, user and password
* Credential encryption key
* A hash of the SiteGuard API secret

Vercel stores only:

* `SITEGUARD_API_URL`
* `SITEGUARD_API_SECRET`
* `SESSION_SECRET`

The browser receives none of those values.

## cPanel setup

1. Create a MariaDB database and user in cPanel.
2. Grant that user all privileges on the new database.
3. Upload the contents of `cpanel-api` to an HTTPS enabled folder or subdomain.
4. In cPanel File Manager, open `private/setup.key` and copy its value.
5. Open `install.php` in your browser.
6. Enter the setup key and the MariaDB credentials.
7. Leave automatic schema installation enabled for a new database. You can instead import `database/schema.sql` using phpMyAdmin.
8. After setup, the installer deletes the setup key, locks itself, and displays the exact three environment variables required by Vercel.

## Vercel setup

1. Open the Vercel project settings.
2. Add the three values shown by the cPanel installer as Environment Variables for Production, Preview and Development as required.
3. Redeploy the application.

No cPanel Remote MySQL allowlist is required for this architecture because the database connection is local to cPanel.

## Security properties

* Browser requests never go directly to the cPanel API.
* The API accepts authenticated POST requests only.
* SQL tables and columns are explicitly allowlisted.
* Raw SQL is never accepted from Vercel.
* Update and delete operations require filters.
* Stored passwords use AES 256 GCM encryption on cPanel.
* The encryption key never leaves cPanel.
* The API secret is stored as a SHA 256 hash on cPanel.
* The private configuration directory is blocked by Apache.
