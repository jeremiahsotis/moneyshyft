# Admin Subdomain Nginx Setup

This repo now includes an nginx host-managed example config at:

- `nginx/host-managed-subdomains.example.conf`

It splits traffic by subdomain:

- `moneyshyft.example.com` -> MoneyShyft web + `127.0.0.1:3000`
- `admin.example.com` -> Admin web + `127.0.0.1:3100`

## Apply on server

```bash
cd ~/moneyshyft

# Copy and edit domain + TLS paths
sudo cp nginx/host-managed-subdomains.example.conf /etc/nginx/sites-available/moneyshyft-subdomains.conf
sudo nano /etc/nginx/sites-available/moneyshyft-subdomains.conf

# Enable site (if not already linked)
sudo ln -s /etc/nginx/sites-available/moneyshyft-subdomains.conf /etc/nginx/sites-enabled/moneyshyft-subdomains.conf

# Validate and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Build artifacts expected by this config

```bash
cd ~/moneyshyft/apps/moneyshyft-web && npm run build
cd ~/moneyshyft/apps/admin-web && npm run build
```

## DNS records expected

- `A/AAAA moneyshyft.example.com -> your server`
- `A/AAAA admin.example.com -> your server`
