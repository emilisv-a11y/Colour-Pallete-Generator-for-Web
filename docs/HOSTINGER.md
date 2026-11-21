# Put D5 WebTool on your own domain (Hostinger Business)

This gives you sign-in, sync between computers, teammates and client review links.
It takes about 20 minutes the first time. After that, every change merged into `main` deploys automatically.

You need: your Hostinger hPanel login and admin access to the GitHub repository.

## 1. Create the subdomain

1. hPanel → **Domains → Subdomains**: create e.g. `tools` for `tools.yourdomain.lt`. Note the folder it creates (shown next to it, e.g. `public_html/tools`).
2. hPanel → **Security → SSL**: make sure the subdomain has the free SSL certificate (padlock). Sign-in only works over `https://`.
3. hPanel → **Advanced → PHP Configuration**: choose **PHP 8.1 or newer** (8.3 recommended) for this website.

## 2. Create the database

hPanel → **Databases → MySQL Databases** → create a new database:

- database name, e.g. `u123456789_d5webtool`
- user, e.g. `u123456789_d5`
- a strong password (save it in your password manager)

Keep these three values for step 5.

## 3. Get FTP details

hPanel → **Files → FTP Accounts**. Note:

- **FTP host** (e.g. `ftp.yourdomain.lt` or an IP address)
- **FTP username** and **password** (create an FTP account if needed)
- the **folder of the subdomain as seen over FTP**. Open hPanel → **File Manager**, go to the subdomain folder from step 1, and note its path from the FTP root, ending with `/`, e.g. `/domains/yourdomain.lt/public_html/tools/` or `/public_html/tools/`.

## 4. Connect GitHub to Hostinger

GitHub → the repository → **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Name | Value |
|---|---|
| `FTP_SERVER` | FTP host from step 3 |
| `FTP_USERNAME` | FTP username |
| `FTP_PASSWORD` | FTP password |
| `FTP_DIR` | subdomain folder path, ending with `/` |

Secrets are encrypted and never visible in the repository (which is public).

Then GitHub → **Actions → Deploy to Hostinger → Run workflow**. Wait for the green tick (2–3 minutes).

If it fails with a TLS/SSL error, add one more secret `FTP_PROTOCOL` with the value `ftp` and run it again.

## 5. Run the one-time setup

Open `https://tools.yourdomain.lt/api/setup.php` and fill in:

- the database name, user and password from step 2 (host stays `localhost`)
- your name, email and a password (at least 10 characters) for your owner account

Press **Finish setup**. The page creates the database tables, saves the connection details in `api/config.php` on the server and locks itself.

## 6. Move your work across and sign in

Browsers keep saved work per website address, so the new address starts empty.

1. On the current site (GitHub Pages), open **Library → Download backup**.
2. On `https://tools.yourdomain.lt`, open **Library → Import backup** and choose that file.
3. Click **Sign in** (top right) and sign in. Your projects upload automatically.

## 7. Add teammates (optional)

**Account & team → Add teammate**. Send them the link, email and temporary password shown. They choose their own password on first sign-in.

## Everyday use

- **Sync** runs automatically every minute while the app is open (and when you return to the tab). The tick next to your initial shows the status.
- **Client review**: Projects → a project → **Client review** → **New review link**. The link is copied; send it to the client.
- **Updates** deploy automatically when changes are merged into `main` (both GitHub Pages and Hostinger).
- **Backups**: Hostinger keeps daily backups; **Library → Download backup** gives you your own copy any time.

## Troubleshooting

| Problem | Fix |
|---|---|
| Page says "not set up yet" | Open `/api/setup.php` (step 5). |
| Setup: "Could not write config.php" | File Manager → `api` folder → permissions `755`, then try again. |
| Setup: "Could not connect to the database" | Check the database name/user/password in hPanel; the host must be `localhost`. |
| "Server error" everywhere | Check the PHP version (step 1.3) is 8.1+. |
| Deploy fails at "Upload to Hostinger" | Check the four secrets; try `FTP_PROTOCOL` = `ftp`; check `FTP_DIR` ends with `/`. |
| Forgot the owner password | In hPanel → **Databases → phpMyAdmin**, delete your row from `d5_users`; in File Manager delete `api/config.php`; run `/api/setup.php` again. Projects, palettes and review links are kept. |
