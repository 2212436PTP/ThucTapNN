const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, serviceRoleKey);

const STUDENTS_50 = [
  { code: '2110452', name: 'Nguyễn Hoàng Minh Châu', email: '2110452@sinhvien.dlu.edu.vn' },
  { code: '2110389', name: 'Trần Quốc Khánh', email: '2110389@sinhvien.dlu.edu.vn' },
  { code: '2210115', name: 'Lê Phương Uyên', email: '2210115@sinhvien.dlu.edu.vn' },
  { code: '2110502', name: 'Phạm Đức Huy', email: '2110502@sinhvien.dlu.edu.vn' },
  { code: '2210874', name: 'Đặng Quỳnh Như', email: '2210874@sinhvien.dlu.edu.vn' },
  { code: '2110291', name: 'Hoàng Gia Bảo', email: '2110291@sinhvien.dlu.edu.vn' },
  { code: '2210633', name: 'Vũ Nhật Nam', email: '2210633@sinhvien.dlu.edu.vn' },
  { code: '2110147', name: 'Huỳnh Anh Tuấn', email: '2110147@sinhvien.dlu.edu.vn' },
  { code: '2210419', name: 'Bùi Mai Phương', email: '2210419@sinhvien.dlu.edu.vn' },
  { code: '2110780', name: 'Đỗ Tiến Dũng', email: '2110780@sinhvien.dlu.edu.vn' },
  { code: '2210355', name: 'Ngô Cẩm Tiên', email: '2210355@sinhvien.dlu.edu.vn' },
  { code: '2110628', name: 'Dương Thế Kiệt', email: '2110628@sinhvien.dlu.edu.vn' },
  { code: '2210741', name: 'Lý Thanh Trúc', email: '2210741@sinhvien.dlu.edu.vn' },
  { code: '2110892', name: 'Mai Văn Phúc', email: '2110892@sinhvien.dlu.edu.vn' },
  { code: '2210204', name: 'Hồ Thùy Linh', email: '2210204@sinhvien.dlu.edu.vn' },
  { code: '2110567', name: 'Võ Trường Giang', email: '2110567@sinhvien.dlu.edu.vn' },
  { code: '2210819', name: 'Lương Thục Đoan', email: '2210819@sinhvien.dlu.edu.vn' },
  { code: '2110342', name: 'Trương Công Thành', email: '2110342@sinhvien.dlu.edu.vn' },
  { code: '2210963', name: 'Phan Diệu My', email: '2210963@sinhvien.dlu.edu.vn' },
  { code: '2110715', name: 'Đinh Hữu Nghĩa', email: '2110715@sinhvien.dlu.edu.vn' },
  { code: '2210156', name: 'Nguyễn Ngọc Băng Tâm', email: '2210156@sinhvien.dlu.edu.vn' },
  { code: '2110823', name: 'Chu Tuấn Hưng', email: '2110823@sinhvien.dlu.edu.vn' },
  { code: '2210498', name: 'Lâm Mỹ Huyền', email: '2210498@sinhvien.dlu.edu.vn' },
  { code: '2110671', name: 'Quách Đại Dương', email: '2110671@sinhvien.dlu.edu.vn' },
  { code: '2210324', name: 'Tạ Hồng Nhung', email: '2210324@sinhvien.dlu.edu.vn' },
  { code: '2110940', name: 'Khổng Minh Trí', email: '2110940@sinhvien.dlu.edu.vn' },
  { code: '2210678', name: 'Đoàn Ngọc Lan', email: '2210678@sinhvien.dlu.edu.vn' },
  { code: '2110255', name: 'Lưu Đình Sang', email: '2110255@sinhvien.dlu.edu.vn' },
  { code: '2210512', name: 'Nghiêm Tuyết Băng', email: '2210512@sinhvien.dlu.edu.vn' },
  { code: '2110486', name: 'Tô Kiến Quốc', email: '2110486@sinhvien.dlu.edu.vn' },
  { code: '2210433', name: 'Trịnh Bảo Ngọc', email: '2210433@sinhvien.dlu.edu.vn' },
  { code: '2110198', name: 'Phan Văn Hùng', email: '2110198@sinhvien.dlu.edu.vn' },
  { code: '2310122', name: 'Lê Thị Kim Ngân', email: '2310122@sinhvien.dlu.edu.vn' },
  { code: '2210577', name: 'Trần Đăng Khoa', email: '2210577@sinhvien.dlu.edu.vn' },
  { code: '2110845', name: 'Nguyễn Thùy Trang', email: '2110845@sinhvien.dlu.edu.vn' },
  { code: '2310341', name: 'Võ Hoàng Khang', email: '2310341@sinhvien.dlu.edu.vn' },
  { code: '2210289', name: 'Mai Phương Thảo', email: '2210289@sinhvien.dlu.edu.vn' },
  { code: '2110612', name: 'Đào Minh Quân', email: '2110612@sinhvien.dlu.edu.vn' },
  { code: '2310487', name: 'Huỳnh Ngọc Trâm', email: '2310487@sinhvien.dlu.edu.vn' },
  { code: '2210756', name: 'Phạm Quang Khải', email: '2210756@sinhvien.dlu.edu.vn' },
  { code: '2110923', name: 'Dương Diễm Hương', email: '2110923@sinhvien.dlu.edu.vn' },
  { code: '2310219', name: 'Bùi Hữu Phước', email: '2310219@sinhvien.dlu.edu.vn' },
  { code: '2210890', name: 'Hà Mỹ Duyên', email: '2210890@sinhvien.dlu.edu.vn' },
  { code: '2110377', name: 'Vũ Thành Đạt', email: '2110377@sinhvien.dlu.edu.vn' },
  { code: '2310563', name: 'Chung Gia Hân', email: '2310563@sinhvien.dlu.edu.vn' },
  { code: '2210642', name: 'Lâm Trọng Tấn', email: '2210642@sinhvien.dlu.edu.vn' },
  { code: '2110499', name: 'Triệu Yến Nhi', email: '2110499@sinhvien.dlu.edu.vn' },
  { code: '2310705', name: 'Quách Gia Huy', email: '2310705@sinhvien.dlu.edu.vn' },
  { code: '2210188', name: 'Vương Diệu Linh', email: '2210188@sinhvien.dlu.edu.vn' },
  { code: '2110734', name: 'Cao Tuấn Kiệt', email: '2110734@sinhvien.dlu.edu.vn' }
];

// Write CSV with UTF-8 BOM
const publicDir = path.join(__dirname, '..', 'public');
const csvHeader = 'Mã Sinh Viên,Họ Và Tên,Email,Ghi Chú\r\n';
const csvRows = STUDENTS_50.map(s => `"${s.code}","${s.name}","${s.email}","Sinh viên chính quy"`).join('\r\n');
const csvContent = '\uFEFF' + csvHeader + csvRows;

fs.writeFileSync(path.join(publicDir, 'du_lieu_mau_50_sinh_vien.csv'), csvContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'du_lieu_mau_sinh_vien.csv'), csvContent, 'utf8');
console.log('CSV files generated successfully.');

// Write XLSX file
const wsData = [
  ['STT', 'Mã Sinh Viên', 'Họ Và Tên', 'Email Liên Hệ', 'Ghi Chú'],
  ...STUDENTS_50.map((s, idx) => [idx + 1, s.code, s.name, s.email, 'Sinh viên chính quy'])
];
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);
ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 32 }, { wch: 22 }];
XLSX.utils.book_append_sheet(wb, ws, 'DanhSach50SinhVien');
XLSX.writeFile(wb, path.join(publicDir, 'du_lieu_mau_50_sinh_vien.xlsx'));
console.log('XLSX file generated successfully.');

async function syncSupabaseAccounts() {
  console.log('Checking Supabase app_users accounts for 50 students...');
  for (const s of STUDENTS_50) {
    const { data: existing } = await supabase.from('app_users').select('id, email').eq('code', s.code).maybeSingle();
    if (!existing) {
      // Create user in Auth
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: s.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { role: 'STUDENT', full_name: s.name, code: s.code }
      });
      const userId = authData?.user?.id || ('usr_st_' + s.code);
      const { error: insErr } = await supabase.from('app_users').insert({
        id: userId,
        code: s.code,
        name: s.name,
        email: s.email,
        role: 'STUDENT'
      });
      if (insErr) {
        console.error('Error inserting app_user for', s.code, insErr.message);
      } else {
        console.log(`+ Added student account: ${s.code} - ${s.name}`);
      }
    }
  }

  const { count } = await supabase.from('app_users').select('*', { count: 'exact', head: true });
  console.log('Total app_users in DB now:', count);
}

syncSupabaseAccounts().catch(console.error);

