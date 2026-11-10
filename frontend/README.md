# ElectroShop frontend

React + Vite storefront and admin console for the Express API in the repository root.

## Run locally

1. Start MongoDB and the API from the repository root:

   ```bash
   npm install
   npm run seed
   npm run dev
   ```

2. In another terminal, start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The default API URL is `http://localhost:3000/api`. To change it, copy `.env.example` to `.env` in this folder and set `VITE_API_URL`.

Seeded login:

- Admin: `admin@shop.local` / `admin123`
- Customer: `customer@shop.local` / `customer123`

The admin API includes a protected `GET /api/products/admin` endpoint so administrators can find and reactivate inactive products. Public product listings continue to include active products only.
