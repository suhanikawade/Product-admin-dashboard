# Product Admin Dashboard

A small admin dashboard built with Next.js for managing products using the DummyJSON API.

## Features finished

- Login page with username and password validation
- Protected routes for authenticated users
- Product list with image, title, category, price, rating, and stock
- Responsive table layout on desktop and card layout on mobile
- Search with debounce behavior
- Category filter
- Sorting by title, price, and rating
- Pagination with page-size selector
- Product detail page with reviews and not-found states
- Add product form with validation
- Edit product form with validation
- Delete product flow with confirmation
- Loading, empty, and error states
- Shared Axios setup with token injection
- URL-based filter/search/sort/page state
- Indian Rupee (INR) price formatting
- Safe image handling for external URLs to avoid runtime Next.js errors

## Tech stack

- Next.js 16
- React 19
- Tailwind CSS
- Axios

## Setup steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the project in development mode:

   ```bash
   npm run dev
   ```

3. Open the app in the browser:

   ```text
   http://localhost:3000
   ```

4. Log in with:

   ```text
   Username: emilys
   Password: emilyspass
   ```

5. Create a production build:

   ```bash
   npm run build
   ```

6. Run the production build:

   ```bash
   npm run start
   ```


