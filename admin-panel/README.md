# Admin panel

Next.js content studio for the English curriculum.

```bash
cd admin-panel
npm install
npm run dev
```

Open http://localhost:3000 and sign in with an admin user. The API defaults to `http://127.0.0.1:8000`. Override with `NEXT_PUBLIC_API_URL`.

Curriculum routes live at `/api/admin/curriculum`. Existing student routes under `/api/content` are unchanged.
