import "server-only";
import { cert, getApps, initializeApp, type App, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)), projectId, storageBucket });
  }

  // App Hosting 런타임: FIREBASE_CONFIG + 기본 서비스 계정(ADC)을 그대로 사용
  if (process.env.FIREBASE_CONFIG && !storageBucket) {
    return initializeApp();
  }

  // 로컬: gcloud application-default 자격 증명 + 명시적 프로젝트/버킷
  const options: AppOptions = {};
  if (projectId) options.projectId = projectId;
  if (storageBucket) options.storageBucket = storageBucket;
  return initializeApp(options);
}

export const adminAuth = () => getAuth(getAdminApp());
export const db = () => getFirestore(getAdminApp());
export const bucket = () => getStorage(getAdminApp()).bucket();

export const teacherDoc = (uid: string) => db().collection("teachers").doc(uid);
export const rubricsCol = (uid: string) => teacherDoc(uid).collection("rubrics");
export const evaluationsCol = (uid: string) => teacherDoc(uid).collection("evaluations");

/** Firestore Timestamp → ISO 문자열 */
export function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return null;
}
