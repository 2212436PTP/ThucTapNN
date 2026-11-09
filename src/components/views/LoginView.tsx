import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Icons } from '../ui/Icons';

export const LoginView = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
    const [accountInput, setAccountInput] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const rawInput = accountInput.trim();
        if (!rawInput) {
            setError('Vui lòng nhập tài khoản (MSSV hoặc Email)');
            setIsLoading(false);
            return;
        }

        let loginEmail = rawInput;

        // Cho phép nhập MSSV không đuôi mail hoặc có đuôi mail
        if (!rawInput.includes('@')) {
            try {
                // Tra cứu email tương ứng theo MSSV trong bảng app_users
                const { data: userRecord } = await supabase
                    .from('app_users')
                    .select('email')
                    .ilike('code', rawInput)
                    .maybeSingle();

                if (userRecord?.email) {
                    loginEmail = userRecord.email;
                } else {
                    // Fallback theo tên miền email sinh viên chuẩn của DLU
                    loginEmail = `${rawInput}@sinhvien.dlu.edu.vn`;
                }
            } catch {
                loginEmail = `${rawInput}@sinhvien.dlu.edu.vn`;
            }
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password
        });

        setIsLoading(false);

        if (error) {
            setError(error.message === 'Invalid login credentials' ? 'Tài khoản (MSSV/Email) hoặc mật khẩu không chính xác' : error.message);
        } else if (data.session) {
            onLoginSuccess();
        }
    };

    return (
        <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-itc-900 p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <img src="/logoitc.jpg" alt="ITC Logo" className="h-10 object-contain" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">ITC Quality</h2>
                    <p className="text-itc-200 text-sm mt-1">Hệ thống Đánh giá Chất lượng Giảng dạy</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg border border-rose-200 flex items-center gap-2">
                                <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                Tài khoản đăng nhập
                            </label>
                            <input 
                                type="text" 
                                required
                                value={accountInput}
                                onChange={(e) => setAccountInput(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-itc-500 transition-all font-medium text-slate-900"
                                placeholder="Nhập MSSV (VD: 2110452) hoặc Email..."
                            />
                            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                                <Icons.Check className="w-3.5 h-3.5 text-itc-600 shrink-0" />
                                <span>Sinh viên có thể nhập mã số sinh viên (VD: <b>2110452</b>) hoặc email đầy đủ.</span>
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Mật khẩu</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-itc-500 transition-all"
                                placeholder="Nhập mật khẩu..."
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-itc-800 hover:bg-itc-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? <Icons.Loader className="w-5 h-5 animate-spin" /> : 'Đăng nhập Hệ thống'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};


