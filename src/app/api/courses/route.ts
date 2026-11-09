import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong .env.local');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

// 1. CREATE NEW COURSE
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, name } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Tên môn học không được để trống' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const newId = `crs_${Date.now()}`;
        const finalCode = (code?.trim() || name.trim().toUpperCase().replace(/\s+/g, '-')).slice(0, 30);

        const { data, error } = await supabaseAdmin.from('courses').insert([
            {
                id: newId,
                code: finalCode,
                name: name.trim()
            }
        ]).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, course: data }, { status: 201 });
    } catch (err: any) {
        console.error('API /courses POST error:', err);
        return NextResponse.json({ error: err.message || 'Lỗi server khi thêm môn học' }, { status: 500 });
    }
}

// 2. UPDATE COURSE
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, code, name } = body;

        if (!id) {
            return NextResponse.json({ error: 'Thiếu ID môn học' }, { status: 400 });
        }
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Tên môn học không được để trống' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin.from('courses').update({
            name: name.trim(),
            ...(code ? { code: code.trim() } : {})
        }).eq('id', id).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, course: data }, { status: 200 });
    } catch (err: any) {
        console.error('API /courses PUT error:', err);
        return NextResponse.json({ error: err.message || 'Lỗi server khi cập nhật môn học' }, { status: 500 });
    }
}

// 3. DELETE COURSE
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Thiếu ID môn học cần xóa' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Check if any class is currently linked to this course
        const { data: linkedClasses, error: classCheckError } = await supabaseAdmin
            .from('classes')
            .select('id, code')
            .eq('course_id', id);

        if (classCheckError) {
            console.error('Error checking linked classes:', classCheckError);
        }

        if (linkedClasses && linkedClasses.length > 0) {
            return NextResponse.json({
                error: `Không thể xóa vì đang có ${linkedClasses.length} lớp học (${linkedClasses.map(c => c.code).join(', ')}) sử dụng môn học này.`
            }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('courses').delete().eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err: any) {
        console.error('API /courses DELETE error:', err);
        return NextResponse.json({ error: err.message || 'Lỗi server khi xóa môn học' }, { status: 500 });
    }
}
