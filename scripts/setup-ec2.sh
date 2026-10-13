#!/usr/bin/env bash
# ─── AWS EC2 (Ubuntu 22.04 / 24.04 LTS) AUTOMATED PROVISIONING SCRIPT ─────────
# Installs Docker, Docker Compose, Git, Nginx, and configures UFW firewall.

set -e

echo "🚀 [1/5] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release ufw git nginx

echo "🐳 [2/5] Installing Docker CE & Docker Compose plugin..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker on startup and allow ubuntu user to run without sudo
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

echo "🛡️  [3/5] Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000/tcp
echo "y" | sudo ufw enable

echo "🌐 [4/5] Configuring Nginx reverse proxy to port 3000..."
sudo tee /etc/nginx/sites-available/prept > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/prept /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ [5/5] Setup complete!"
echo "--------------------------------------------------------"
echo "Log out and log back in to apply Docker group permissions:"
echo "  exit"
echo "Then deploy with:"
echo "  git clone <your-repo> prept && cd prept"
echo "  cp .env.example .env (fill in your secrets)"
echo "  docker compose up -d --build"
echo "--------------------------------------------------------"
