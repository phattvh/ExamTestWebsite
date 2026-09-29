import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Alert, CircularProgress, Chip,
} from '@mui/material';
import {
  CloudUpload, Download as DownloadIcon, HelpOutlined,
  CheckCircle, TableChart,
} from '@mui/icons-material';
import * as xlsx from 'xlsx';
import { transformExcelRowsToQuestions, downloadSampleQuestionExcel } from '../utils/excelQuestionTransform';

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  onImportApi: (payloads: any[]) => Promise<any>;
}

export const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({
  open,
  onClose,
  onImportSuccess,
  onImportApi,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedFileName(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    setSelectedFileName(file.name);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer) return;

        const workbook = xlsx.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(worksheet);

        const { payloads, errors } = transformExcelRowsToQuestions(rows as any[]);

        if (payloads.length === 0) {
          setErrorMsg(`Không tìm thấy câu hỏi hợp lệ nào trong file.${errors.length ? ' Lỗi: ' + errors.slice(0, 3).join(' | ') : ''}`);
          setLoading(false);
          return;
        }

        await onImportApi(payloads);
        setSuccessMsg(`Nhập thành công ${payloads.length} câu hỏi vào ngân hàng đề thi!`);
        if (errors.length > 0) {
          setErrorMsg(`Lưu ý: Bỏ qua ${errors.length} dòng không đúng định dạng. Dòng lỗi đầu tiên: ${errors[0]}`);
        }
        onImportSuccess(payloads.length);
      } catch (err: any) {
        console.error('Failed to import Excel questions:', err);
        setErrorMsg(err?.response?.data?.detail || 'Import thất bại. Vui lòng kiểm tra lại cấu trúc file Excel theo mẫu.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, p: 1 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <TableChart sx={{ color: '#2563EB', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.15rem' }}>
              Nhập câu hỏi từ file Excel (.xlsx, .xls)
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Thêm hàng loạt câu hỏi trắc nghiệm vào ngân hàng đề thi trong 1 click
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={downloadSampleQuestionExcel}
          sx={{
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 1.2,
            px: 2,
            boxShadow: 'none',
          }}
        >
          Tải file Excel mẫu chuẩn (.xlsx)
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Step-by-step Quick Guide */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: '#F8FAFC',
            borderRadius: 1.5,
            border: '1px solid #E2E8F0',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HelpOutlined sx={{ fontSize: 18, color: '#2563EB' }} /> Quy định cấu trúc cột file Excel:
          </Typography>
          
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 1 }}>
            <Table size="small" sx={{ minWidth: 500 }}>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#334155' }}>Tên cột (Header)</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#334155' }}>Bắt buộc</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#334155' }}>Ý nghĩa & Giá trị mẫu</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#2563EB', fontSize: '0.8rem' }}>text</TableCell>
                  <TableCell><Chip label="Bắt buộc" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>Nội dung câu hỏi (VD: <i>Thủ đô của Việt Nam là gì?</i>)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#2563EB', fontSize: '0.8rem' }}>type</TableCell>
                  <TableCell><Chip label="Tùy chọn" size="small" sx={{ height: 20, fontSize: '0.7rem' }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                    <code>multiple_choice</code> (1 đáp án), <code>multiple_select</code> (nhiều đáp án), <code>true_false</code> (đúng/sai)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#2563EB', fontSize: '0.8rem' }}>option_1..option_4</TableCell>
                  <TableCell><Chip label="Bắt buộc" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>Các lựa chọn A, B, C, D (Tối thiểu 2 đáp án trở lên)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#2563EB', fontSize: '0.8rem' }}>correct_answer</TableCell>
                  <TableCell><Chip label="Bắt buộc" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                    Thứ tự đáp án đúng: <code>1</code> (chọn A), <code>1,3</code> (chọn A và C), hoặc <code>true</code> / <code>false</code>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#2563EB', fontSize: '0.8rem' }}>subject / mon_hoc</TableCell>
                  <TableCell><Chip label="Tùy chọn" size="small" sx={{ height: 20, fontSize: '0.7rem' }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>Tên môn học hoặc chủ đề của câu hỏi (VD: <i>Toán học</i>, <i>Địa lý</i>, <i>Tiếng Anh</i>)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Upload Dropzone */}
        <input
          type="file"
          accept=".xlsx, .xls"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={onFileInputChange}
        />

        <Paper
          elevation={0}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            p: 4,
            border: '2px dashed #93C5FD',
            borderRadius: 2,
            bgcolor: '#EFF6FF',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: '#2563EB',
              bgcolor: '#DBEAFE',
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={36} color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2563EB' }}>
                Đang đọc và xử lý file Excel...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CloudUpload sx={{ fontSize: 44, color: '#2563EB' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {selectedFileName ? selectedFileName : 'Nhấp vào đây để chọn file Excel (.xlsx, .xls)'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Hoặc kéo thả file Excel câu hỏi trực tiếp vào khung này
              </Typography>
            </Box>
          )}
        </Paper>

        {successMsg && (
          <Alert severity="success" icon={<CheckCircle fontSize="inherit" />} sx={{ borderRadius: 1.5 }}>
            {successMsg}
          </Alert>
        )}

        {errorMsg && (
          <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
            {errorMsg}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: '1px solid #E2E8F0' }}>
        <Button
          onClick={handleClose}
          sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExcelImportDialog;
