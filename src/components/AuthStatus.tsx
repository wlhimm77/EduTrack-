import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  User 
} from 'firebase/auth';
import { LogIn, LogOut, Loader2, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSafariHelp, setShowSafariHelp] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    // Ensure local persistence is active across Safari sessions
    try {
      setPersistence(auth, indexedDBLocalPersistence).catch(() => {
        setPersistence(auth, browserLocalPersistence).catch(() => {});
      });
    } catch {
      // ignore
    }

    // 1. Listen to Auth State
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    // 2. Check for redirect results (especially critical for iPad / Safari redirect flow)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          setErrorMsg(null);
        }
      })
      .catch((error) => {
        console.warn('Redirect sign-in error:', error);
        // Only show if user actually initiated a redirect that returned with an error
        if (error?.code !== 'auth/null-user') {
          setErrorMsg('跳轉登入失敗：' + (error?.message || String(error)));
        }
      });

    return () => unsubscribe();
  }, []);

  const handleSignInPopup = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await setPersistence(auth, browserLocalPersistence);
      const res = await signInWithPopup(auth, provider);
      if (res?.user) {
        setUser(res.user);
      }
    } catch (error: any) {
      console.warn('Popup login failed, analyzing cause:', error);
      const code = error?.code || '';
      const msg = error?.message || '';
      
      // iPad Safari typical error when popup closes without returning auth token (ITP / 3rd party cookie block)
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked' ||
        code === 'auth/network-request-failed' ||
        msg.includes('cross-origin') ||
        msg.includes('storage') ||
        msg.includes('cookie')
      ) {
        setErrorMsg('iPad Safari 彈出視窗通訊受阻（自動關閉）。請使用「全頁面跳轉」或點擊在新分頁開啟。');
      } else {
        setErrorMsg(`登入未完成 (${code || msg})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInRedirect = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      console.error('Redirect login error:', error);
      setErrorMsg('跳轉失敗：' + (error?.message || String(error)));
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setErrorMsg(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="max-w-[140px] truncate sm:max-w-[200px]">{user.email}</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-xs px-2.5 py-1 rounded-lg border border-[#D9CEC1] text-[#7A4B3A] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1 font-semibold"
          title="登出目前帳號"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">登出</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {isLoading ? (
        <button 
          disabled
          className="text-xs px-3 py-1.5 rounded-lg bg-[#3D3833] text-white flex items-center gap-1.5 opacity-80"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>連線中...</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Main button: Uses Redirect mode directly on iOS / iPad / Safari to avoid popup auto-close bugs */}
          <button 
            onClick={handleSignInRedirect}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#3D3833] hover:bg-[#2B2723] text-white transition-colors flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
            title="使用 Google 帳號登入 (適用所有裝置及 iPad Safari)"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Google 登入</span>
          </button>

          {/* Secondary Popup Login for desktop users who prefer popups */}
          <button
            onClick={handleSignInPopup}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-[#D9CEC1] text-[#7A4B3A] hover:bg-[#FAF7F2] transition-colors hidden lg:inline-flex items-center gap-1"
            title="使用彈出視窗登入 (桌面電腦推薦)"
          >
            彈出視窗登入
          </button>

          <button
            onClick={() => setShowSafariHelp(!showSafariHelp)}
            className="p-1 text-[#8E877F] hover:text-[#3D3833] transition-colors"
            title="iPad / Safari 登入說明"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Safari / iPad Help Modal / Tooltip */}
      {showSafariHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FAF7F2] border border-[#D9CEC1] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3 relative text-left">
            <div className="flex items-center justify-between border-b border-[#E9E3DB] pb-2">
              <h4 className="text-sm font-bold text-[#3D3833] flex items-center gap-1.5">
                🍎 iPad / Safari 登入指引
              </h4>
              <button 
                onClick={() => setShowSafariHelp(false)}
                className="text-xs text-gray-500 hover:text-black font-bold p-1"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-[#4A443F] leading-relaxed">
              iPad Safari 因預設<strong>「防止跨網站追蹤 (ITP)」</strong>與<strong>第三方 Cookie 限制</strong>，彈出式視窗在完成驗證後會被 Safari 隔離而自動關閉，無法回傳 Token。
            </p>

            <div className="space-y-2 text-xs text-[#3D3833] bg-white p-3 rounded-xl border border-[#E9E3DB]">
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-[#88968A]">✅ 最簡解法：</span>
                <span>直接點擊<strong>「Google 登入」</strong>（已升級為全頁面跳轉模式），驗證後會自動跳轉回系統並完成登入。</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-[#88968A]">⚙️ Safari 設定：</span>
                <span>若在非全頁面環境，至 iPad「設定」&gt;「Safari」，將「防止跨網站追蹤」關閉即可支援彈出視窗。</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSafariHelp(false);
                  handleSignInRedirect();
                }}
                className="px-3.5 py-2 bg-[#3D3833] hover:bg-[#2B2723] text-white text-xs font-bold rounded-xl"
              >
                立即執行登入 (Redirect)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error alert toast */}
      {errorMsg && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs shadow-lg z-50 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMsg}</p>
            <button 
              onClick={handleSignInRedirect}
              className="mt-1.5 text-[11px] font-bold text-blue-700 underline block"
            >
              改用全頁面跳轉登入 (Redirect) →
            </button>
          </div>
          <button 
            onClick={() => setErrorMsg(null)}
            className="text-xs text-amber-600 hover:text-black"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

