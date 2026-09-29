import * as xlsx from 'xlsx';

export interface ExcelUserRow {
  username?: string;
  tai_khoan?: string;
  full_name?: string;
  ho_ten?: string;
  email?: string;
  password?: string;
  mat_khau?: string;
  role?: string;
  vai_tro?: string;
  [key: string]: any;
}

export interface UserTransformResult {
  payloads: Array<{
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: string;
  }>;
  errors: string[];
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function transformExcelRowsToUsers(rows: any[]): UserTransformResult {
  const payloads: Array<{
    username: string;
    email: string;
    full_name: string;
    password: string;
    role: string;
  }> = [];
  const errors: string[] = [];
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // Dòng 1 là Header
    const row: Record<string, any> = {};
    Object.keys(rawRow || {}).forEach((k) => {
      row[normalizeKey(k)] = rawRow[k];
    });

    const username = String(
      row['username'] ||
      row['tai_khoan'] ||
      row['ten_dang_nhap'] ||
      row['ma_hoc_sinh'] ||
      row['ma_thi_sinh'] ||
      row['user_name'] ||
      ''
    ).trim();

    const fullName = String(
      row['full_name'] ||
      row['ho_ten'] ||
      row['ho_va_ten'] ||
      row['ten'] ||
      row['name'] ||
      ''
    ).trim();

    const email = String(
      row['email'] ||
      row['dia_chi_email'] ||
      row['mail'] ||
      ''
    ).trim().toLowerCase();

    let password = String(
      row['password'] ||
      row['mat_khau'] ||
      row['pass'] ||
      ''
    ).trim();

    if (!password) {
      password = 'Student@123'; // Mật khẩu mặc định nếu để trống
    }

    let rawRole = String(
      row['role'] ||
      row['vai_tro'] ||
      row['chuc_vu'] ||
      'student'
    ).trim().toLowerCase();

    let role = 'student';
    if (rawRole.includes('giao_vien') || rawRole.includes('teacher') || rawRole === 'gv') {
      role = 'teacher';
    } else if (rawRole.includes('admin') || rawRole.includes('quan_tri')) {
      role = 'admin';
    }

    if (!username) {
      errors.push(`Dòng ${rowNum}: Thiếu tên tài khoản (cột 'tai_khoan' hoặc 'username').`);
      return;
    }

    if (!email) {
      errors.push(`Dòng ${rowNum}: Thiếu email (cột 'email').`);
      return;
    }

    // Kiểm tra định dạng email cơ bản
    if (!email.includes('@') || !email.includes('.')) {
      errors.push(`Dòng ${rowNum}: Email '${email}' không đúng định dạng.`);
      return;
    }

    if (seenUsernames.has(username.toLowerCase())) {
      errors.push(`Dòng ${rowNum}: Trùng lặp tên tài khoản '${username}' trong file.`);
      return;
    }
    seenUsernames.add(username.toLowerCase());

    if (seenEmails.has(email)) {
      errors.push(`Dòng ${rowNum}: Trùng lặp email '${email}' trong file.`);
      return;
    }
    seenEmails.add(email);

    payloads.push({
      username,
      email,
      full_name: fullName || username,
      password,
      role,
    });
  });

  return { payloads, errors };
}

export function downloadSampleUserExcel() {
  const sampleData = [
    {
      'Tài khoản (*)': 'nguyen_van_a',
      'Họ và tên': 'Nguyễn Văn A',
      'Email (*)': 'nguyenvana@school.edu.vn',
      'Mật khẩu': 'Student@123',
      'Vai trò': 'student',
    },
    {
      'Tài khoản (*)': 'tran_thi_b',
      'Họ và tên': 'Trần Thị B',
      'Email (*)': 'tranthib@school.edu.vn',
      'Mật khẩu': 'Student@123',
      'Vai trò': 'student',
    },
    {
      'Tài khoản (*)': 'le_hoang_c',
      'Họ và tên': 'Lê Hoàng C',
      'Email (*)': 'lehoangc@school.edu.vn',
      'Mật khẩu': 'Student@123',
      'Vai trò': 'student',
    },
    {
      'Tài khoản (*)': 'pham_minh_d',
      'Họ và tên': 'Phạm Minh D',
      'Email (*)': 'phamminhd@school.edu.vn',
      'Mật khẩu': 'Student@123',
      'Vai trò': 'student',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);

  ws['!cols'] = [
    { wch: 20 }, // Tài khoản
    { wch: 24 }, // Họ và tên
    { wch: 30 }, // Email
    { wch: 18 }, // Mật khẩu
    { wch: 15 }, // Vai trò
  ];

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');

  xlsx.writeFile(wb, 'mau_import_hoc_sinh_chuan.xlsx');
}
