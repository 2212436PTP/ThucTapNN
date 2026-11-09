import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { teacherId } = body;

        if (!teacherId) {
            return NextResponse.json({ error: 'Thiếu ID giảng viên' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Delete from app_users first (to satisfy foreign key constraints if any)
        const { error: dbError } = await supabaseAdmin.from('app_users').delete().eq('id', teacherId);
        
        if (dbError) {
            return NextResponse.json({ error: 'Không thể xóa dữ liệu giảng viên (có thể đang có lớp học)' }, { status: 400 });
        }

        // Kiểm tra xem ID có phải là UUID hợp lệ không (dữ liệu mẫu cũ dùng tch_1 không phải UUID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacherId);

        // 2. Delete from auth.users
        if (isUUID) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(teacherId);

            if (authError) {
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
    }
}
