# RAG Fullstack Application with Digital Ocean

A Retrieval-Augmented Generation (RAG) application using React, TypeScript, Node.js, Express, PostgreSQL, and Digital Ocean Gradient AI Platform.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with pgvector extension
- **AI/ML**: Digital Ocean Gradient AI Platform
  - Embedding Model: `multi-qa-mpnet-base-dot-v1`
  - Chat Model: `llama3-8b-instruct`
- **Deployment**: Digital Ocean Droplet + PM2 + GitHub Actions

## Prerequisites

- Digital Ocean account
- GitHub account
- SSH client
- Node.js 20+ installed locally

## Setup Instructions

### 1. Create Digital Ocean Droplet

1. Log into Digital Ocean
2. Create → Droplets
3. Choose **Ubuntu 22.04 LTS**
4. Plan: **Basic** (minimum 2GB RAM recommended)
5. Add your SSH key
   - If you don't have one: `ssh-keygen -t ed25519`
   - **Important**: If key exists, type `n` to avoid overwriting
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
6. Create Droplet

**SSH into your droplet:**

```bash
ssh root@your_droplet_ip
```

### 2. Install Dependencies on Droplet

```bash
# Update system
apt update && apt upgrade -y
```

**Note**: During upgrade, if prompted about config files:

- For most files: "Install package maintainer's version"
- For SSH config: "Keep currently-installed version" (press N)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install build tools
apt install -y build-essential git

# Install PM2
npm install -g pm2
```

### 3. Set Up PostgreSQL with pgvector

```bash
# Install pgvector
apt install -y postgresql-server-dev-all
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

**Configure database:**

```bash
sudo -u postgres psql << EOF
CREATE DATABASE ragapp;
CREATE USER raguser WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE ragapp TO raguser;
\c ragapp
CREATE EXTENSION vector;
ALTER DATABASE ragapp OWNER TO raguser;
EOF
```

**Remember your password!** You'll need it for the `.env` file.

**Test connection:**

```bash
psql "postgresql://raguser:YourSecurePassword123!@localhost:5432/ragapp"
# Type \q to exit
```

**To reset password later:**

```bash
sudo -u postgres psql
ALTER USER raguser WITH PASSWORD 'NewPassword';
\q
```

### 4. Get Digital Ocean API Key

1. Go to https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Name: "RAG App"
4. Select **both Read and Write** scopes
5. **Copy token immediately** (can't view again!)

### 5. Local Development Setup

**Clone repository:**

```bash
git clone https://github.com/YOUR_USERNAME/rag-app.git
cd rag-app
```

**Install dependencies:**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**Create local `.env`:**

```bash
cd ../backend
cp .env.example .env
# Edit with your actual values
```

### 6. GitHub CI/CD Setup

The repository includes `.github/workflows/deploy.yml` for automatic deployment.

**Important: SSH Key for GitHub Actions**

GitHub Actions cannot use SSH keys with passphrases. You have two options:

**Option A: Create a new key without passphrase (recommended for CI/CD)**

```bash
# On your local machine
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github_actions -N ""
# Press Enter to accept defaults

# Copy the public key to your droplet
ssh-copy-id -i ~/.ssh/id_ed25519_github_actions.pub root@your_droplet_ip

# Test it works
ssh -i ~/.ssh/id_ed25519_github_actions root@your_droplet_ip
```

Then use this key for GitHub secrets:

```bash
cat ~/.ssh/id_ed25519_github_actions
```

**Option B: Remove passphrase from existing key (less secure)**

```bash
# On your local machine
ssh-keygen -p -f ~/.ssh/id_ed25519
# Enter old passphrase
# Press Enter twice for new passphrase (leave empty)
```

**Set up GitHub Secrets:**

1. Go to repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add two secrets:
   - Name: `DROPLET_IP`
     Value: your droplet IP (just the IP, no http://)
   - Name: `SSH_PRIVATE_KEY`
     Value: output of `cat ~/.ssh/id_ed25519_github_actions` (or your key file)
     **Important**: Include the entire key including `-----BEGIN` and `-----END` lines

### 7. Deploy to Droplet

**Initialize Git on droplet:**

```bash
ssh root@your_droplet_ip

mkdir -p /var/www/rag-app
cd /var/www/rag-app

git init
git remote add origin https://github.com/YOUR_USERNAME/rag-app.git
git fetch
git checkout -b main
git pull origin main
```

**Create production `.env`:**

```bash
cd backend
nano .env
```

Add your actual values:

```env
PORT=3001
DATABASE_URL=postgresql://raguser:YourActualPassword@localhost:5432/ragapp
DO_API_KEY=your_actual_digitalocean_api_key
ALLOWED_ORIGINS=http://your_droplet_ip:3000
```

**Important**: Replace `your_droplet_ip` with your actual droplet IP address. The `ALLOWED_ORIGINS` variable controls which frontend origins can access the API (CORS security).

Save and exit: Ctrl+X, Y, Enter

**Build and start services:**

```bash
# Backend
cd /var/www/rag-app/backend
npm install
npm run build
pm2 start ecosystem.config.js

# Frontend
cd /var/www/rag-app/frontend
npm install
# IMPORTANT: Set API URL for production build (replace YOUR_DROPLET_IP with your actual IP)
export VITE_API_URL=http://YOUR_DROPLET_IP:3001/api
npm run build
pm2 serve dist 3000 --name "rag-frontend" --spa

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Run the command it outputs
```

**Configure firewall:**

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 3000  # Frontend
ufw allow 3001  # Backend API
ufw enable
```

## Usage

**Access your application:**
Visit `http://your_droplet_ip:3000`

**Test the RAG system:**

1. Add a document with information
2. Ask a question about that content
3. The system retrieves relevant docs and generates an AI answer

**Make updates:**

```bash
# Work locally in your IDE
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions automatically deploys to your droplet!
```

## Useful Commands

**PM2 Process Management:**

```bash
pm2 list                    # List all processes
pm2 logs rag-backend        # View backend logs
pm2 logs rag-frontend       # View frontend logs
pm2 restart all             # Restart all processes
pm2 stop all                # Stop all processes
pm2 monit                   # Monitor CPU/memory usage
```

**Database Management:**

```bash
# Connect to database
psql "postgresql://raguser:password@localhost:5432/ragapp"

# Common psql commands
\dt                         # List tables
\d documents                # Describe documents table
SELECT COUNT(*) FROM documents;  # Count documents
\q                          # Quit
```

## Troubleshooting

### Backend Won't Start

**Check logs:**

```bash
pm2 logs rag-backend --lines 50
```

**Common issues:**

- **Wrong DATABASE_URL**: Test connection
  ```bash
  psql "postgresql://raguser:password@localhost:5432/ragapp"
  ```
- **Wrong DO_API_KEY**: Verify at https://cloud.digitalocean.com/account/api/tokens
  - Must have both Read and Write permissions
- **Port already in use**:
  ```bash
  lsof -i :3001
  # Kill process if needed
  ```

### Frontend Can't Connect to Backend

**Test backend health:**

```bash
curl http://localhost:3001/api/health
```

**If backend is running but frontend can't connect:**

The most common issue is that `VITE_API_URL` wasn't set during the frontend build. Vite environment variables must be set at **build time**, not runtime.

**Fix:**

```bash
cd /var/www/rag-app/frontend
# Set API URL (replace YOUR_DROPLET_IP with your actual IP)
export VITE_API_URL=http://YOUR_DROPLET_IP:3001/api
npm run build
pm2 restart rag-frontend
```

**Check what API URL the frontend is using:**

Open browser console (F12) and check the error messages - they will show the API URL being used. If it shows `http://localhost:3001/api`, the build didn't have `VITE_API_URL` set.

**For GitHub Actions deployments:**

The workflow automatically sets `VITE_API_URL` using the `DROPLET_IP` secret. Make sure your GitHub secret is set correctly.

### Database Connection Errors

**Reset PostgreSQL password:**

```bash
sudo -u postgres psql
ALTER USER raguser WITH PASSWORD 'NewSecurePassword';
\q

# Update .env
cd /var/www/rag-app/backend
nano .env
# Update DATABASE_URL with new password

# Restart backend
pm2 restart rag-backend
```

### GitHub Actions Deployment Fails

**SSH key errors (`ssh: this private key is passphrase protected`):**

Your SSH key has a passphrase. GitHub Actions can't use passphrase-protected keys. Solutions:

1. **Create new key without passphrase:**

   ```bash
   # On local machine
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github_actions -N ""

   # Add to droplet
   ssh-copy-id -i ~/.ssh/id_ed25519_github_actions.pub root@your_droplet_ip

   # Test it
   ssh -i ~/.ssh/id_ed25519_github_actions root@your_droplet_ip

   # Update GitHub secret with new key
   cat ~/.ssh/id_ed25519_github_actions
   ```

2. **Or remove passphrase from existing key:**
   ```bash
   ssh-keygen -p -f ~/.ssh/id_ed25519
   # Enter old passphrase, leave new empty
   ```

**Other common issues:**

- **SSH key format**: Must include complete `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines
- **DROPLET_IP format**: Just the IP address (e.g., `143.198.123.45`), no `http://` or port number
- **Whitespace in secrets**: Make sure no extra spaces before/after key or IP

**Test SSH connection manually:**

```bash
ssh -i ~/.ssh/id_ed25519_github_actions root@your_droplet_ip
```

**View GitHub Actions logs:**
Go to your repo → Actions tab → Click on failed workflow → View error details

### CORS Errors

**If you see CORS errors in the browser console:**

The backend uses a whitelist of allowed origins for security. Make sure `ALLOWED_ORIGINS` is set in your backend `.env` file:

```bash
cd /var/www/rag-app/backend
nano .env
```

Add or update:

```env
ALLOWED_ORIGINS=http://your_droplet_ip:3000
```

For multiple origins (e.g., development and production), use comma-separated values:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://your_droplet_ip:3000
```

After updating, restart the backend:

```bash
pm2 restart rag-backend
```

**Default allowed origins (development only):**

- `http://localhost:3000`
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

### Digital Ocean API Errors

**Test API key:**

```bash
curl -X POST https://api.digitalocean.com/v2/ai/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"multi-qa-mpnet-base-dot-v1","input":"test"}'
```

If this fails, regenerate your API key with both Read and Write permissions.

## Architecture

### How It Works

1. **Document Ingestion:**

   - User submits text → sent to DO Gradient AI
   - Embedding model generates vector (768 dimensions)
   - Document + embedding stored in PostgreSQL

2. **Query Process:**

   - User asks question → converted to embedding
   - PostgreSQL finds most similar documents (cosine similarity)
   - Top 3 relevant documents retrieved

3. **Answer Generation:**
   - Retrieved documents used as context
   - Context + question sent to Llama 3.1 8B
   - AI generates answer based on context

### Database Schema

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX documents_embedding_idx
ON documents USING ivfflat (embedding vector_cosine_ops);
```

### API Endpoints

- `POST /api/documents` - Add a new document
- `GET /api/documents` - List all documents
- `POST /api/query` - Ask a question (RAG)
- `GET /api/health` - Health check

## Production Deployment

For production, consider:

**Infrastructure:**

- [ ] Use managed PostgreSQL database
- [ ] Set up domain name
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL with Let's Encrypt

**Security:**

- [ ] Implement authentication (JWT/OAuth)
- [ ] Add rate limiting
- [x] Set up proper CORS policies (configured via `ALLOWED_ORIGINS` env var)
- [ ] Use environment-specific configs

**Monitoring:**

- [ ] Set up logging (Winston, Morgan)
- [ ] Configure error tracking (Sentry)
- [ ] Enable DO monitoring
- [ ] Set up automated backups

**Example Nginx config:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Resources

- [Digital Ocean Gradient AI Documentation](https://docs.digitalocean.com/products/gradient-ai-platform/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Express.js Guide](https://expressjs.com/)
- [Vite Documentation](https://vitejs.dev/)

## License

MIT

---

Built with Digital Ocean Gradient AI Platform
