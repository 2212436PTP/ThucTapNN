import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { supabase } from '../../lib/supabaseClient';

export const ChangePasswordModal = ({ onClose, onSuccess }: any) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp');
            return;
        }

        setIsLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({ password });

        setIsLoading(false);

        if (updateError) {
            setError(updateError.message);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="bg-itc-50 p-5 border-b border-itc-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                            <Icons.Lock className="w-5 h-5 text-itc-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Thiết lập Mật khẩu</h3>
                            <p className="text-xs text-slate-500">Tạo mật khẩu để đăng nhập lần sau</p>
                        </div>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition">
                            <Icons.Plus className="w-5 h-5 text-slate-400 rotate-45" />
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs rounded-lg border border-rose-100">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật khẩu mới</label>
                            <input 
                                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Nhập mật khẩu mới..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nhập lại Mật khẩu</label>
                            <input 
                                type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Xác nhận mật khẩu..."
                            />
                        </div>
                        
                        <div className="pt-4 flex gap-3">
                            {onClose && (
                                <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition">Bỏ qua</button>
                            )}
                            <button type="submit" disabled={isLoading} className="flex-1 bg-itc-600 hover:bg-itc-700 text-white font-bold py-3 rounded-xl transition">
                                {isLoading ? 'Đang lưu...' : 'Lưu Mật khẩu'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

