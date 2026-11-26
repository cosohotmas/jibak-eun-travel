import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  CartItem,
  SavedChecklistRecord,
  StoreInquiryRecord,
  StoreOrderRecord,
  TransportModeId,
} from '../types/domain';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

function formatFirestoreDate(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toLocaleString('ko-KR', { hour12: false });
  }
  return new Date().toLocaleString('ko-KR', { hour12: false });
}

export interface CreateOrderInput {
  buyerName: string;
  buyerEmail: string;
  departureDate: string;
  paymentMethod: string;
  shippingAddress: string;
  shippingZipCode?: string;
  shippingBaseAddress?: string;
  shippingDetailAddress?: string;
  transportModes: TransportModeId[];
  items: CartItem[];
  totalAmount: number;
}

export async function createOrderInFirestore(input: CreateOrderInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  const path = 'orders';
  const boundedItems = input.items.slice(0, 15).map((item) => ({
    productId: item.productId.slice(0, 60),
    name: item.name.slice(0, 80),
    imageUrl: (item.imageUrl || '').slice(0, 300),
    optionSize: item.optionSize.slice(0, 40),
    optionColor: item.optionColor.slice(0, 40),
    price: Math.max(0, Math.round(item.unitPrice)),
    qty: Math.max(1, Math.round(item.qty)),
    volume: Math.max(1, Math.round(item.volumeUnits)),
  }));
  const itemSummary = boundedItems
    .map((it) => `${it.name} (${it.optionSize}/${it.optionColor}) × ${it.qty}`)
    .join(', ')
    .slice(0, 490);
  const selectedOptionsSummary = boundedItems
    .map((it) => `${it.optionSize} · ${it.optionColor}`)
    .join(' / ')
    .slice(0, 490);
  const trackingNumber = `CJ${String(Date.now()).slice(-10)}`;

  const payload: Record<string, unknown> = {
    userId: user.uid,
    buyerName: input.buyerName.trim().slice(0, 60) || '여행자',
    buyerEmail: (input.buyerEmail.trim() || user.email || 'traveler@example.com').slice(0, 120),
    departureDate: input.departureDate.trim().slice(0, 20) || '2026-12-01',
    paymentMethod: input.paymentMethod.trim().slice(0, 40) || '간편결제',
    shippingAddress: input.shippingAddress.trim().slice(0, 200),
    selectedOptionsSummary,
    transportModes: input.transportModes.slice(0, 7),
    itemSummary: itemSummary || '여행 준비물 주문',
    items: boundedItems,
    totalAmount: Math.max(0, Math.min(100000000, Math.round(input.totalAmount))),
    shippingStatus: '결제완료',
    courier: 'CJ대한통운',
    trackingNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.shippingZipCode && input.shippingZipCode.trim()) {
    payload.shippingZipCode = input.shippingZipCode.trim().slice(0, 10);
  }
  if (input.shippingBaseAddress && input.shippingBaseAddress.trim()) {
    payload.shippingBaseAddress = input.shippingBaseAddress.trim().slice(0, 150);
  }
  if (input.shippingDetailAddress && input.shippingDetailAddress.trim()) {
    payload.shippingDetailAddress = input.shippingDetailAddress.trim().slice(0, 100);
  }

  try {
    const ref = await addDoc(collection(db, path), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function advanceOrderStatusInFirestore(
  orderId: string,
  nextStatus: '결제완료' | '상품준비중' | '배송중' | '배송완료'
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      shippingStatus: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserOrders(
  userId: string,
  onData: (orders: StoreOrderRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StoreOrderRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId || ''),
          buyerName: String(data.buyerName || ''),
          buyerEmail: String(data.buyerEmail || ''),
          departureDate: String(data.departureDate || ''),
          paymentMethod: String(data.paymentMethod || ''),
          shippingAddress: data.shippingAddress ? String(data.shippingAddress) : '',
          shippingZipCode: data.shippingZipCode ? String(data.shippingZipCode) : '',
          shippingBaseAddress: data.shippingBaseAddress ? String(data.shippingBaseAddress) : '',
          shippingDetailAddress: data.shippingDetailAddress ? String(data.shippingDetailAddress) : '',
          selectedOptionsSummary: data.selectedOptionsSummary ? String(data.selectedOptionsSummary) : '',
          transportModes: Array.isArray(data.transportModes) ? data.transportModes : [],
          itemSummary: String(data.itemSummary || ''),
          items: Array.isArray(data.items) ? data.items : [],
          totalAmount: Number(data.totalAmount || 0),
          shippingStatus: data.shippingStatus || '결제완료',
          courier: String(data.courier || 'CJ대한통운'),
          trackingNumber: String(data.trackingNumber || ''),
          createdAtText: formatFirestoreDate(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeAllOrdersForAdmin(
  onData: (orders: StoreOrderRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StoreOrderRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId || ''),
          buyerName: String(data.buyerName || ''),
          buyerEmail: String(data.buyerEmail || ''),
          departureDate: String(data.departureDate || ''),
          paymentMethod: String(data.paymentMethod || ''),
          shippingAddress: data.shippingAddress ? String(data.shippingAddress) : '',
          shippingZipCode: data.shippingZipCode ? String(data.shippingZipCode) : '',
          shippingBaseAddress: data.shippingBaseAddress ? String(data.shippingBaseAddress) : '',
          shippingDetailAddress: data.shippingDetailAddress ? String(data.shippingDetailAddress) : '',
          selectedOptionsSummary: data.selectedOptionsSummary ? String(data.selectedOptionsSummary) : '',
          transportModes: Array.isArray(data.transportModes) ? data.transportModes : [],
          itemSummary: String(data.itemSummary || ''),
          items: Array.isArray(data.items) ? data.items : [],
          totalAmount: Number(data.totalAmount || 0),
          shippingStatus: data.shippingStatus || '결제완료',
          courier: String(data.courier || 'CJ대한통운'),
          trackingNumber: String(data.trackingNumber || ''),
          createdAtText: formatFirestoreDate(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function updateOrderShippingAsAdmin(
  orderId: string,
  patch: {
    shippingStatus: '결제완료' | '상품준비중' | '배송중' | '배송완료';
    courier: string;
    trackingNumber: string;
  }
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      shippingStatus: patch.shippingStatus,
      courier: (patch.courier.trim() || 'CJ대한통운').slice(0, 40),
      trackingNumber: (patch.trackingNumber.trim() || 'CJ0000000000').slice(0, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface CreateInquiryInput {
  category: '상품 문의' | '배송 문의' | '교환·환불' | '기타';
  subject: string;
  message: string;
  orderId?: string;
}

export async function createInquiryInFirestore(input: CreateInquiryInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  const path = 'inquiries';
  const payload: Record<string, unknown> = {
    userId: user.uid,
    userEmail: (user.email || 'traveler@example.com').slice(0, 120),
    category: input.category,
    subject: input.subject.trim().slice(0, 100),
    message: input.message.trim().slice(0, 1000),
    status: '답변 대기',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.orderId && input.orderId.trim()) {
    payload.orderId = input.orderId.trim().slice(0, 128);
  }
  try {
    const ref = await addDoc(collection(db, path), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserInquiries(
  userId: string,
  onData: (inquiries: StoreInquiryRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'inquiries';
  const q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StoreInquiryRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId || ''),
          userEmail: String(data.userEmail || ''),
          orderId: data.orderId ? String(data.orderId) : undefined,
          category: data.category || '기타',
          subject: String(data.subject || ''),
          message: String(data.message || ''),
          status: data.status || '답변 대기',
          createdAtText: formatFirestoreDate(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export interface SaveChecklistInput {
  title: string;
  destination: string;
  duration: string;
  theme: string;
  companion: string;
  transportModes: TransportModeId[];
  haveItems: string[];
  buyItems: string[];
  localItems: string[];
  carrierType: string;
  loadPercent: number;
}

export async function saveChecklistInFirestore(input: SaveChecklistInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  const path = 'checklists';
  try {
    const ref = await addDoc(collection(db, path), {
      userId: user.uid,
      title: input.title.trim().slice(0, 100) || '맞춤 여행 체크리스트',
      destination: input.destination.trim().slice(0, 60) || '미정',
      duration: input.duration.trim().slice(0, 40) || '1박 2일',
      theme: input.theme.trim().slice(0, 40) || '일반 여행',
      companion: input.companion.trim().slice(0, 40) || '혼자',
      transportModes: input.transportModes.slice(0, 7),
      haveItems: input.haveItems.slice(0, 30),
      buyItems: input.buyItems.slice(0, 30),
      localItems: input.localItems.slice(0, 30),
      carrierType: input.carrierType.slice(0, 40),
      loadPercent: Math.max(0, Math.min(1000, Math.round(input.loadPercent))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteChecklistInFirestore(checklistId: string): Promise<void> {
  const path = `checklists/${checklistId}`;
  try {
    await deleteDoc(doc(db, 'checklists', checklistId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserChecklists(
  userId: string,
  onData: (checklists: SavedChecklistRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'checklists';
  const q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SavedChecklistRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId || ''),
          title: String(data.title || ''),
          destination: String(data.destination || ''),
          duration: String(data.duration || ''),
          theme: String(data.theme || ''),
          companion: String(data.companion || ''),
          transportModes: Array.isArray(data.transportModes) ? data.transportModes : [],
          haveItems: Array.isArray(data.haveItems) ? data.haveItems : [],
          buyItems: Array.isArray(data.buyItems) ? data.buyItems : [],
          localItems: Array.isArray(data.localItems) ? data.localItems : [],
          carrierType: String(data.carrierType || ''),
          loadPercent: Number(data.loadPercent || 0),
          createdAtText: formatFirestoreDate(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}
