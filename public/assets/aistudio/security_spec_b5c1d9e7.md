# Security Specification — 여행 보수상 (Travel Bosusang)

## 1. Data Invariants
1. All `/orders/{orderId}` documents contain buyer PII (`buyerName`, `buyerEmail`) and purchase records; only the owning user (`request.auth.uid == resource.data.userId`) may read, list, create, or update their own orders.
2. All `/inquiries/{inquiryId}` documents contain user email and private support messages; only the owning user (`request.auth.uid == resource.data.userId`) may read, list, or create their own inquiries.
3. On `create`, `userId` MUST match `request.auth.uid`, `createdAt` and `updatedAt` MUST match `request.time`, and all string/array bounds MUST match `firebase-blueprint.json`.
4. On `update` for `/orders/{orderId}`, `userId` and `createdAt` are immutable, `updatedAt` MUST equal `request.time`, and only `shippingStatus` and `updatedAt` may change (and once `shippingStatus == '배송완료'`, no further updates are allowed).
5. Default-deny catch-all (`match /{document=**} { allow read, write: if false; }`) rejects any unmapped paths.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated read on orders**: `get(/orders/order1)` with `auth == null` -> DENIED.
2. **Cross-user order read (PII leak)**: `get(/orders/order_of_userB)` signed in as `userA` -> DENIED.
3. **Unscoped list query on orders**: `list(/orders)` without `where('userId', '==', auth.uid)` -> DENIED.
4. **Identity spoofing on order create**: `create(/orders/o1)` with `userId: 'other_uid'` -> DENIED.
5. **Shadow / ghost field injection**: `create(/orders/o1)` adding `isAdmin: true` -> DENIED (`hasOnly` blocks unknown fields).
6. **Timestamp spoofing**: `create(/orders/o1)` with client timestamp instead of `request.time` -> DENIED.
7. **Resource poisoning (oversized string)**: `create(/orders/o1)` with `buyerName` > 60 chars or `orderId` > 128 chars -> DENIED.
8. **Unbounded array attack**: `create(/orders/o1)` with `items.size() > 15` or empty `items` -> DENIED.
9. **Immutable owner overwrite**: `update(/orders/o1)` attempting to change `userId` or `totalAmount` -> DENIED (`affectedKeys().hasOnly(['shippingStatus', 'updatedAt'])`).
10. **Terminal state tampering**: `update(/orders/o1)` when existing `shippingStatus == '배송완료'` -> DENIED.
11. **Cross-user inquiry read/list**: `list(/inquiries)` without `where('userId', '==', auth.uid)` -> DENIED.
12. **Inquiry status spoofing on create**: `create(/inquiries/inq1)` with `status: '답변 완료'` -> DENIED (`status == '답변 대기'` enforced on create).
