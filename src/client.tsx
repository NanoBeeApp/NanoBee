import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

// Hydrates the SSR document; the router instance comes from src/router.tsx
// (resolved by the Start plugin's "router entry" convention).
hydrateRoot(document, <StartClient />);
