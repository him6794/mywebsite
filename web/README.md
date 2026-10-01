# React frontend

The public portfolio, writing pages, forms, and authenticated workspace are React + TypeScript routes built with Vite. The interface uses Tailwind CSS 4 and components installed with the official shadcn CLI in `src/components/ui`.

From the repository root:

```sh
npm --prefix web ci
npm --prefix web run dev
npm --prefix web run build
npm --prefix web run lint
npm --prefix web run format:check
```

Build before starting the Go server in a clean deployment. Public pages and the admin workspace are loaded on demand; the Markdown renderer is loaded only for articles or an editor preview.
