import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '10')));
        const classId = searchParams.get('classId');
        const teacherId = searchParams.get('teacherId');
        const ratingFilter = searchParams.get('ratingFilter');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Chưa cấu hình Supabase credentials' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Xây dựng query cơ sở, loại trừ các bản ghi cấu hình hệ thống
        let query = supabase
            .from('reviews')
            .select('*', { count: 'exact' })
            .not('id', 'like', 'cfg_%')
            .order('created_at', { ascending: false });

        if (classId && classId !== 'ALL') {
            query = query.eq('class_id', classId);
        }

        if (startDate) {
            query = query.gte('created_at', startDate + 'T00:00:00.000Z');
        }

        if (endDate) {
            query = query.lte('created_at', endDate + 'T23:59:59.999Z');
        }

        // Tính toán range cho Server-side Pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: rawReviews, error, count } = await query.range(from, to);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        return NextResponse.json({
            data: rawReviews || [],
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Lỗi server khi phân trang' }, { status: 500 });
    }
}

