/// <reference types="vite/client" />

interface ImportMetaEnv {
  // The only VITE_-prefixed variable the app reads. Empty means same-origin relative requests.
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
