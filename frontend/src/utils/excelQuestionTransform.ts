import * as xlsx from 'xlsx';

export interface ExcelQuestionRow {
  text?: string;
  type?: string;
  subject?: string;
  difficulty?: string;
  tags?: string;
  correct_answer?: string | number;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  option_6?: string;
  [key: string]: any;
}

export interface TransformResult {
  payloads: any[];
  errors: string[];
}

const VALID_TYPES = new Set(['multiple_choice', 'multiple_select', 'true_false']);

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function transformExcelRowsToQuestions(rows: any[]): TransformResult {
  const payloads: any[] = [];
  const errors: string[] = [];

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // Dòng 1 là header
    // Chuẩn hóa tên các cột trong row
    const row: Record<string, any> = {};
    Object.keys(rawRow || {}).forEach((k) => {
      row[normalizeKey(k)] = rawRow[k];
    });

    const text = String(
      row['text'] || row['noi_dung'] || row['cau_hoi'] || row['content'] || row['noi_dung_cau_hoi'] || ''
    ).trim();

    let rawType = String(
      row['type'] || row['loai'] || row['loai_cau_hoi'] || row['the_loai'] || 'multiple_choice'
    ).trim().toLowerCase();

    // Map các alias loại câu hỏi tiếng Việt
    if (rawType.includes('dung_sai') || rawType.includes('true_false') || rawType === 'tf') {
      rawType = 'true_false';
    } else if (rawType.includes('nhieu_dap_an') || rawType.includes('multiple_select') || rawType === 'ms') {
      rawType = 'multiple_select';
    } else if (rawType.includes('trac_nghiem') || rawType.includes('multiple_choice') || rawType === 'mc') {
      rawType = 'multiple_choice';
    }

    if (!text) {
      errors.push(`Dòng ${rowNum}: thiếu nội dung câu hỏi.`);
      return;
    }
    if (!VALID_TYPES.has(rawType)) {
      errors.push(`Dòng ${rowNum}: loại câu hỏi "${rawType}" không hỗ trợ qua Excel (chỉ multiple_choice / multiple_select / true_false).`);
      return;
    }

    const subject = String(
      row['subject'] || row['mon_hoc'] || row['chu_de'] || row['danh_muc'] || 'Chung'
    ).trim();

    const difficulty = 'medium';

    const tags = String(row['tags'] || row['the'] || row['tag'] || '').split(',').map((t) => t.trim()).filter(Boolean);

    let options: { id: string; text: string; is_correct: boolean }[] = [];
    let correctAnswer: string | string[] = '';

    if (rawType === 'true_false') {
      const correctRaw = String(
        (row['correct_answer'] || row['dap_an_dung'] || row['dap_an'] || row['dap_an_chinh_xac']) ?? ''
      ).trim().toLowerCase();
      const isTrue = ['true', 'đúng', 'dung', '1', 't', 'd'].includes(correctRaw);
      options = [
        { id: 'opt_true', text: 'Đúng', is_correct: isTrue },
        { id: 'opt_false', text: 'Sai', is_correct: !isTrue },
      ];
      correctAnswer = isTrue ? 'opt_true' : 'opt_false';
    } else {
      const rawOptions: string[] = [];
      for (let i = 1; i <= 6; i++) {
        const val =
          row[`option_${i}`] ||
          row[`option${i}`] ||
          row[`lua_chon_${i}`] ||
          row[`lua_chon${i}`] ||
          row[`dap_an_${i}`] ||
          row[`dap_an${i}`] ||
          row[`lua_chon_${String.fromCharCode(64 + i).toLowerCase()}`] || // lua_chon_a, b, c, d
          row[`dap_an_${String.fromCharCode(64 + i).toLowerCase()}`];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          rawOptions.push(String(val).trim());
        }
      }

      if (rawOptions.length < 2) {
        errors.push(`Dòng ${rowNum}: cần có ít nhất 2 đáp án lựa chọn (cột option_1, option_2 hoặc lua_chon_1, lua_chon_2...).`);
        return;
      }

      const rawCorrect = String(
        (row['correct_answer'] || row['dap_an_dung'] || row['dap_an'] || row['dap_an_chinh_xac']) ?? ''
      ).trim();

      // Chuyển ký tự chữ A,B,C,D thành 1,2,3,4 nếu có
      const normalizedCorrect = rawCorrect.replace(/[A-Fa-f]/g, (char) => {
        return String(char.toUpperCase().charCodeAt(0) - 64);
      });

      const correctIndices = normalizedCorrect
        .split(/[,\s;]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= rawOptions.length);

      if (correctIndices.length === 0) {
        errors.push(`Dòng ${rowNum}: cột "correct_answer" (hoặc "dap_an_dung") phải ghi số thứ tự đáp án đúng (VD: 1 hoặc 1,3 hoặc A hoặc A,C).`);
        return;
      }

      if (rawType === 'multiple_choice' && correctIndices.length > 1) {
        errors.push(`Dòng ${rowNum}: loại câu hỏi "multiple_choice" chỉ có 1 đáp án đúng, hệ thống sẽ chọn đáp án đầu tiên (${correctIndices[0]}).`);
      }

      options = rawOptions.map((optText, i) => ({
        id: `opt_${i + 1}`,
        text: optText,
        is_correct: correctIndices.includes(i + 1),
      }));

      correctAnswer = rawType === 'multiple_choice'
        ? `opt_${correctIndices[0]}`
        : correctIndices.map((i) => `opt_${i}`);
    }

    payloads.push({
      content: { text },
      type: rawType,
      options,
      correct_answer: correctAnswer,
      metadata: { subject, difficulty, tags },
    });
  });

  return { payloads, errors };
}

export function downloadSampleQuestionExcel() {
  const sampleData = [
    {
      text: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là thành phố nào?',
      type: 'multiple_choice',
      subject: 'Địa lý',
      option_1: 'Hà Nội',
      option_2: 'Đà Nẵng',
      option_3: 'TP. Hồ Chí Minh',
      option_4: 'Hải Phòng',
      option_5: '',
      option_6: '',
      correct_answer: '1',
      tags: 'dia_ly, lich_su',
    },
    {
      text: 'Những thành phố nào sau đây là thành phố trực thuộc Trung ương của Việt Nam?',
      type: 'multiple_select',
      subject: 'Địa lý',
      option_1: 'Hà Nội',
      option_2: 'Đà Lạt',
      option_3: 'Cần Thơ',
      option_4: 'Nha Trang',
      option_5: '',
      option_6: '',
      correct_answer: '1,3',
      tags: 'dia_ly, do_thi',
    },
    {
      text: 'Mặt trời luôn mọc ở hướng Đông và lặn ở hướng Tây?',
      type: 'true_false',
      subject: 'Khoa học',
      option_1: '',
      option_2: '',
      option_3: '',
      option_4: '',
      option_5: '',
      option_6: '',
      correct_answer: 'true',
      tags: 'thien_van, tu_nhien',
    },
    {
      text: 'Giao thức nào được sử dụng để truyền tải văn bản siêu văn bản an toàn trên mạng Internet?',
      type: 'multiple_choice',
      subject: 'Tin học',
      option_1: 'HTTP',
      option_2: 'FTP',
      option_3: 'HTTPS',
      option_4: 'SMTP',
      option_5: '',
      option_6: '',
      correct_answer: '3',
      tags: 'mang_may_tinh, bao_mat',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);
  // Cài đặt độ rộng cột cho dễ đọc
  ws['!cols'] = [
    { wch: 45 }, // text
    { wch: 18 }, // type
    { wch: 15 }, // subject
    { wch: 25 }, // option_1
    { wch: 25 }, // option_2
    { wch: 25 }, // option_3
    { wch: 25 }, // option_4
    { wch: 20 }, // option_5
    { wch: 20 }, // option_6
    { wch: 16 }, // correct_answer
    { wch: 20 }, // tags
  ];

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Mau_Cau_Hoi');
  xlsx.writeFile(wb, 'Mau_Nhap_Cau_Hoi_ExamBank.xlsx');
}

