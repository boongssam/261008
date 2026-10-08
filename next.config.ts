import type { NextConfig } from "next";

// Firebase App Hosting은 빌드 시 FIREBASE_WEBAPP_CONFIG(웹 앱 설정 JSON)를 자동으로 주입합니다.
// 로컬 개발에서는 .env.local의 NEXT_PUBLIC_FIREBASE_* 값을 사용합니다.
type WebAppConfig = Partial<Record<"apiKey" | "authDomain" | "projectId" | "storageBucket" | "appId", string>>;

let webapp: WebAppConfig = {};
try {
  webapp = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG ?? "{}");
} catch {
  webapp = {};
}

const pick = (name: string, fallback?: string) => process.env[name] || fallback || "";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: pick("NEXT_PUBLIC_FIREBASE_API_KEY", webapp.apiKey),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: pick("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", webapp.authDomain),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: pick("NEXT_PUBLIC_FIREBASE_PROJECT_ID", webapp.projectId),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: pick("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", webapp.storageBucket),
    NEXT_PUBLIC_FIREBASE_APP_ID: pick("NEXT_PUBLIC_FIREBASE_APP_ID", webapp.appId),
  },
};

export default nextConfig;
