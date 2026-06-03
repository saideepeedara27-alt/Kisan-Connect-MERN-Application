# Kisan Connect

Kisan Connect is a MERN farm marketplace application I built to connect farmers, customers, delivery partners, and an admin team in one simple flow. The idea is practical: farmers can list available stock, customers can buy fresh products, delivery partners can handle assigned orders, and the admin can verify farmer details before trust is shown in the marketplace.

This project focuses on a real farm-to-customer workflow instead of only showing static product cards. It includes role-based dashboards, product stock handling, customer orders, delivery updates, farmer verification, support requests, Docker deployment, MongoDB Atlas support, and GitHub Actions deployment to EC2.

## What I Built

- A customer marketplace with search, category filters, location filters, price filters, sorting, saved products, cart, checkout, and order history.
- A farmer dashboard where farmers can activate a subscription, add products, edit stock, hide/show listings, and manage order status.
- A delivery partner desk where delivery users can see assigned orders and update delivery progress.
- An admin verification desk for reviewing farmer registration details.
- Area-based delivery partner assignment so orders can be connected to partners by service location.
- Order date and time visibility across customer, farmer, and delivery views.
- Customer support with a support widget, call option, request form, and support history.
- Google login for customers, with backend token verification before the app creates its JWT session.
- A redesigned frontend with a cleaner logo, marketplace sections, improved admin desk, and a market-page footer.
- Docker and Docker Compose setup for containerized hosting.
- MongoDB Atlas configuration for hosted database usage.
- GitHub Actions CI/CD for automatic EC2 deployment.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express
- Database: MongoDB / MongoDB Atlas
- Authentication: JWT and Google Identity Services
- Uploads: Multer local uploads
- Deployment: Docker, Docker Compose, GitHub Actions, EC2
- HTTPS option: Caddy with Let's Encrypt

## Project Structure

```text
client/      React frontend
server/      Express backend and MongoDB models
.github/     GitHub Actions deployment workflow
Dockerfile.* Docker build files
docker-compose.yml
Caddyfile    HTTPS reverse proxy config
```

## Frontend And Backend

The frontend is the part users see in the browser. It lives in `client/` and contains the marketplace, dashboards, forms, cart, order screens, and support UI.

The backend is the API and business logic. It lives in `server/` and handles authentication, users, farmer verification, products, stock, orders, support tickets, delivery assignment, and uploaded files.

## Local Setup

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example server/.env
```

Use either local MongoDB or MongoDB Atlas in `server/.env`.

For local MongoDB:

```env
MONGO_URI=mongodb://127.0.0.1:27017/farm_connect
```

For Atlas:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/farm_connect?retryWrites=true&w=majority
```

To enable Google login locally, add your Google OAuth web client ID:

```env
GOOGLE_CLIENT_ID=your_google_web_client_id
```

Run the app:

```bash
npm run dev
```

Local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5001
```

Build the frontend:

```bash
npm run build
```

Seed demo data:

```bash
npm run seed
```

Create or update only the admin account:

```bash
npm run create-admin
```

## Docker Setup

Create the root `.env` file:

```bash
cp .env.example .env
```

For local Docker testing, use:

```env
CLIENT_PORT=5173
CLIENT_URL=http://localhost:5173
MONGO_URI=your_atlas_uri_with_/farm_connect
JWT_SECRET=make_a_long_random_secret
GOOGLE_CLIENT_ID=your_google_web_client_id
```

Run containers:

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:5173
```

Stop containers:

```bash
docker compose down
```

Check containers:

```bash
docker compose ps
```

## Google Login Setup

Google login is optional, but the code is ready for it. The frontend renders Google's official sign-in button, the backend verifies Google's ID token, and then Kisan Connect creates the same JWT session used by normal login.

To enable it:

1. Open Google Cloud Console.
2. Create or select a project.
3. Configure the OAuth consent screen.
4. Create an OAuth **Web application** client ID.
5. Add your frontend URLs as authorized JavaScript origins.

For local development:

```text
http://localhost:5173
```

For EC2 HTTP testing:

```text
http://YOUR_EC2_PUBLIC_IP
```

For the free HTTPS hostname:

```text
https://16.16.176.100.sslip.io
```

Set the OAuth client ID in `.env`, `server/.env`, or GitHub Secrets:

```env
GOOGLE_CLIENT_ID=your_google_web_client_id
```

If `GOOGLE_CLIENT_ID` is empty, email/password login still works and the Google button stays hidden.

## EC2 Hosting

For EC2 hosting, MongoDB Atlas is recommended. The EC2 server runs the app containers, while Atlas stores the database.

Basic EC2 checklist:

- Launch an Ubuntu EC2 instance.
- Allow inbound SSH `22` from your IP.
- Allow inbound HTTP `80` for normal HTTP hosting.
- Allow inbound HTTPS `443` if you are using a domain and SSL.
- Add the EC2 public IP to MongoDB Atlas Network Access.
- Install Docker and Docker Compose plugin on EC2.

Install Docker on Ubuntu:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo ${UBUNTU_CODENAME:-$VERSION_CODENAME}) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and log back in after adding the Docker group.

Manual deploy on EC2:

```bash
git clone https://github.com/saideepeedara27-alt/Kisan-Connect-MERN-Application.git
cd Kisan-Connect-MERN-Application
cp .env.example .env
nano .env
docker compose up --build -d
docker compose ps
```

For IP-based hosting, use:

```env
CLIENT_URL=http://YOUR_EC2_PUBLIC_IP
CLIENT_PORT=80
```

The app will open at:

```text
http://YOUR_EC2_PUBLIC_IP
```

## Making The Site Secure With HTTPS

If the browser shows `Not Secure`, it is because the app is being opened with plain HTTP.

The cleanest option is using a real domain name, but you can also use a free DNS helper such as `sslip.io` if you do not want to buy a domain.

For example, if the EC2 public IP is:

```text
16.16.176.100
```

Use this free hostname:

```text
16.16.176.100.sslip.io
```

That hostname automatically points to `16.16.176.100`, so Caddy can request a trusted HTTPS certificate for it.

HTTPS steps:

1. Use a domain you own, or use the free `YOUR_EC2_PUBLIC_IP.sslip.io` hostname.
2. In the EC2 security group, open ports `80` and `443`.
3. Make sure the EC2 public IP does not change. An AWS Elastic IP is better for this.
4. Set these values:

```env
APP_DOMAIN=16.16.176.100.sslip.io
CLIENT_URL=https://16.16.176.100.sslip.io
CLIENT_PORT=127.0.0.1:8080
```

5. Start with the HTTPS profile:

```bash
docker compose --profile https up --build -d
```

Caddy will request and renew the SSL certificate automatically through Let's Encrypt.

Open the secure app at:

```text
https://16.16.176.100.sslip.io
```

If port `80` or `443` is already occupied, stop the old service/container first:

```bash
docker ps
docker rm -f OLD_CONTAINER_ID
```

## GitHub Actions CI/CD

The workflow in `.github/workflows/deploy-ec2.yml` runs when code is pushed to `main`.

It:

- Builds the frontend.
- Validates Docker Compose.
- SSHes into EC2.
- Pulls the latest code.
- Writes `.env` from GitHub Secrets.
- Rebuilds and restarts the containers.
- Cleans old containers using ports `5001`, `80`, and `443`.

Required GitHub Secrets:

```text
EC2_HOST=your_ec2_public_ip
EC2_USER=ubuntu
EC2_SSH_KEY=your_private_key_content
CLIENT_URL=http://your_ec2_public_ip
MONGO_URI=your_atlas_uri_with_/farm_connect
JWT_SECRET=long_random_secret
GOOGLE_CLIENT_ID=your_google_web_client_id
```

For HTTPS deployment, add:

```text
APP_DOMAIN=your-domain.com
```

When `APP_DOMAIN` is present, the workflow automatically uses:

```text
CLIENT_URL=https://your-domain.com
CLIENT_PORT=127.0.0.1:8080
docker compose --profile https up --build -d --remove-orphans
```

Optional GitHub Secrets:

```text
EC2_PORT=22
EC2_APP_DIR=/home/ubuntu/kisan-connect
ADDITIONAL_CLIENT_URLS=https://www.your-domain.com
JWT_EXPIRES_IN=7d
FARMER_SUBSCRIPTION_AMOUNT=199
CUSTOMER_PLATFORM_FEE=15
CURRENCY=INR
FAST_DELIVERY_PROVIDER=Kisan Connect Delivery
FAST_DELIVERY_ETA_MINUTES=45
FAST_DELIVERY_PHONE=+918880045045
SUPPORT_PHONE=+918880012345
SUPPORT_EMAIL=support@kisanconnect.local
SUPPORT_HOURS=Every day, 8 AM - 8 PM
```

## Demo Accounts

```text
Farmer:        farmer@example.com / Password123
Second farmer: farmer2@example.com / Password123
Customer:      customer@example.com / Password123
Admin:         admin@example.com / Password123
```

## Demo Categories

- Vegetables
- Fruits
- Grains
- Dairy
- Spices
- Pulses
- Leafy Greens

## Notes

- Payments are mocked in this version, but payment references are stored so a real provider like Razorpay or Stripe can be connected later.
- MongoDB Atlas stores database records, but uploaded product images are stored in `server/uploads`.
- If you migrate real data to Atlas, do not run the seed script unless you intentionally want demo data.
- The backend port `5001` is bound to `127.0.0.1` in Docker, so users do not need public access to the API port.
