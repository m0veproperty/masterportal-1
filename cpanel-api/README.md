# SiteGuard cPanel API

This folder is deployed to a PHP enabled cPanel host. It keeps the MariaDB connection and credential encryption key on the same server as the database. Vercel communicates with it over HTTPS using one bearer secret.

## Setup

1. Create an empty MariaDB database and database user in cPanel and grant that user all privileges on the database.
2. Upload this entire `cpanel-api` folder to an HTTPS enabled subdomain or folder on the cPanel account.
3. Open `install.php` in the browser.
4. Enter the local MariaDB details. Normally the database host is `localhost`.
5. Keep `Install the SiteGuard tables automatically` enabled, or import `database/schema.sql` manually through phpMyAdmin.
6. The installer tests MariaDB, generates the API secret, generates the credential encryption key, and writes `private/config.local.php`.
7. Copy the three Vercel environment variables shown after setup into the Vercel project.
8. Redeploy the app.

The installer locks itself after configuration. The API does not enable browser CORS and accepts only authenticated server to server POST requests.
