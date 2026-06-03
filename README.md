# Kisan Connect MERN App

Kisan Connect is a farmer-to-customer marketplace MVP with separate flows for farmers, customers, delivery partners, and admin.

## What The App Does

- Farmers register, activate a nominal subscription, upload stock, and manage customer orders.
- Farmers can edit listings, hide/show products, and see low-stock inventory alerts.
- Customers browse product categories, filter by price/location, sort stock, add items to cart, place orders, and pay a nominal platform fee.
- Product cards show farmer details and a direct call option when a farmer phone number exists.
- Customers can contact support through an in-app chat request, direct call button, and support history.
- Stock is reserved atomically during checkout to reduce overselling risk.
- Demo stock is available through the seed script so the marketplace does not look empty during testing.

## Frontend And Backend

**Frontend** is the visible app used in the browser. In this project it lives in `client/` and is built with React + Vite. It contains pages, buttons, forms, product cards, cart, checkout, farmer dashboard, and the support widget.

**Backend** is the server that handles data and business logic. In this project it lives in `server/` and is built with Node.js + Express + MongoDB. It handles login, farmer subscriptions, product stock, orders, support requests, and uploaded product images.

## Main Features

- Role-based farmer and customer interfaces
- Farmer verification details collected during registration
- Farmer trust status shown in dashboard and product cards
- Admin verification desk for approving, rejecting, or reviewing farmer requests
- Farmer subscription activation
- Product image upload or image URL
- Product editing and visibility controls
- Category, location, price, and sorting filters
- Paginated marketplace API
- Cart and checkout
- Customer order history
- Farmer order status updates
- Customer support ticket creation and history
- Demo seed data across multiple stock categories

## Tech Stack

- MongoDB
- Express
- React + Vite
- Node.js
- JWT authentication
- Local image uploads with Multer

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the server environment file if it does not already exist. For local development, use your local MongoDB URI or Atlas URI:

```bash
cp .env.example server/.env
```

3. Start MongoDB locally.

4. Add demo data:

```bash
npm run seed
```

5. Run the app:

```bash
npm run dev
```

The API runs on `http://localhost:5001` and the client runs on `http://localhost:5173`.

Run only the backend:

```bash
npm run dev:server
```

Run only the frontend:

```bash
npm run dev:client
```

Build the frontend:

```bash
npm run build
```

## Docker Hosting

This project is configured for hosting with MongoDB Atlas. Create the environment file:

```bash
cp .env.example .env
```

For local Docker testing, set these values in `.env`:

```env
CLIENT_PORT=5173
CLIENT_URL=http://localhost:5173
MONGO_URI=your_atlas_uri_with_/farm_connect
JWT_SECRET=make_a_long_random_secret
```

Run:

```bash
docker compose up --build -d
```

Then open `http://localhost:5173`.

Stop:

```bash
docker compose down
```

Do not run the seed script after migrating your real data to Atlas unless you intentionally want to reset/demo-fill records.

Check containers:

```bash
docker compose ps
```

## EC2 Hosting Setup

1. Launch an Ubuntu EC2 instance.
2. In the EC2 security group, allow inbound SSH `22` from your IP and HTTP `80` from the internet.
3. In MongoDB Atlas, add your EC2 public IP to **Network Access**. For quick testing you can temporarily allow `0.0.0.0/0`, but a fixed EC2 IP is safer.
4. Install Docker on EC2:

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

5. Log out and log back in.
6. Clone the project to EC2 for manual deployment, or let GitHub Actions clone/pull it during CI/CD.
7. Create the EC2 environment file for manual deployment:

```bash
cp .env.example .env
```

8. Edit `.env`:

- Replace `YOUR_EC2_PUBLIC_IP` in `CLIENT_URL`.
- Paste your Atlas URI into `MONGO_URI`, including `/farm_connect`.
- Replace `JWT_SECRET` with a long random value.

9. Start the app manually:

```bash
docker compose up --build -d
```

10. Check containers:

```bash
docker compose ps
```

The hosted app will be available at `http://YOUR_EC2_PUBLIC_IP`. The frontend proxies `/api` and `/uploads` to the backend container, so port `5001` is bound only to `127.0.0.1` and does not need to be opened publicly for users.

Copy the `server/uploads` folder to EC2 with the project if you want existing product images to appear after migration. MongoDB Atlas stores the records, but uploaded image files still live in `server/uploads`.

## GitHub Actions CI/CD

The workflow in `.github/workflows/deploy-ec2.yml` runs on pushes to `main`.

It does three things:

- Builds the React frontend.
- Validates `docker-compose.yml`.
- SSHes into EC2, clones or pulls this GitHub repository, writes `.env` from GitHub Secrets, and runs `docker compose up --build -d`.

Add these GitHub Actions secrets:

```text
EC2_HOST=your_ec2_public_ip
EC2_USER=ubuntu
EC2_SSH_KEY=your_private_key_content
CLIENT_URL=http://your_ec2_public_ip
MONGO_URI=your_atlas_uri_with_/farm_connect
JWT_SECRET=long_random_secret
```

Optional secrets:

```text
EC2_PORT=22
EC2_APP_DIR=/home/ubuntu/kisan-connect
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

After secrets are added, push to `main` and GitHub Actions will deploy to EC2.

Create or update only the admin account without resetting products/users:

```bash
npm run create-admin
```

## Demo Accounts

- Farmer: `farmer@example.com` / `Password123`
- Second farmer: `farmer2@example.com` / `Password123`
- Customer: `customer@example.com` / `Password123`
- Admin: `admin@example.com` / `Password123`

## Demo Categories

- Vegetables
- Fruits
- Grains
- Dairy
- Spices
- Pulses
- Leafy Greens

## Charges And Support

The nominal charges and support contact details are configured in `server/.env`:

- `FARMER_SUBSCRIPTION_AMOUNT`
- `CUSTOMER_PLATFORM_FEE`
- `CURRENCY`
- `SUPPORT_PHONE`
- `SUPPORT_EMAIL`
- `SUPPORT_HOURS`

Payments are mocked in this version. The subscription and checkout routes already keep payment references, so Razorpay, Stripe, or another provider can be connected later.
