/// <reference types="vite/client" />

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_CHATBOT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

