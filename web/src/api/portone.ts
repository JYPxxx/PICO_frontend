// PortOne 브라우저 SDK(결제창·본인인증창). 필요할 때만 스크립트를 불러온다.
type PortOneResult = { code?: string; message?: string; txId?: string; paymentId?: string; identityVerificationId?: string } | undefined;

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (req: Record<string, unknown>) => Promise<PortOneResult>;
      requestIdentityVerification: (req: Record<string, unknown>) => Promise<PortOneResult>;
    };
  }
}

export function loadPortOne() {
  if (window.PortOne) return Promise.resolve(window.PortOne);
  return new Promise<NonNullable<Window['PortOne']>>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    s.onload = () => (window.PortOne ? resolve(window.PortOne) : reject(new Error('결제·인증창을 불러오지 못했어요.')));
    s.onerror = () => reject(new Error('결제·인증창을 불러오지 못했어요.'));
    document.head.appendChild(s);
  });
}
