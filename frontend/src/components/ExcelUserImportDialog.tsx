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
import { transformExcelRowsToUsers, downloadSampleUserExcel } from '../utils/excelUserTransform';

interface ExcelUserImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  onImportApi: (payloads: any[]) => Promise<any>;
}

export const ExcelUserImportDialog: React.FC<ExcelUserImportDialogProps> = ({
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

        const { payloads, errors } = transformExcelRowsToUsers(rows as any[]);

        if (payloads.length === 0) {
          setErrorMsg(`Không tìm thấy thông tin tài khoản hợp lệ nào trong file.${errors.length ? ' Lỗi: ' + errors.slice(0, 3).join(' | ') : ''}`);
          setLoading(false);
          return;
        }

        const res = await onImportApi(payloads);
        const createdCount = res?.created_count ?? payloads.length;
        const skippedCount = res?.skipped_count ?? 0;

        setSuccessMsg(`Nhập thành công ${createdCount} tài khoản học sinh vào hệ thống!${skippedCount > 0 ? ` (Bỏ qua ${skippedCount} tài khoản đã tồn tại)` : ''}`);
        if (errors.length > 0) {
          setErrorMsg(`Lưu ý: Bỏ qua ${errors.length} dòng không đúng định dạng. Dòng lỗi đầu tiên: ${errors[0]}`);
        }
        onImportSuccess(createdCount);
      } catch (err: any) {
        console.error('Failed to import Excel users:', err);
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
      <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChart sx={{ color: '#2563EB' }} /> Nhập danh sách Học sinh từ File Excel (.xlsx)
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
          onClick={downloadSampleUserExcel}
          sx={{
            bgcolor: '#10B981',
            '&:hover': { bgcolor: '#059669' },
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 1.2,
          }}
        >
          Tải file Excel mẫu chuẩn (.xlsx)
        </Button>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Hướng dẫn cấu trúc file Excel */}
        <Box
          sx={{
            bgcolor: '#F8FAFC',
            p: 2,
            borderRadius: 1.5,
            border: '1px solid #E2E8F0',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HelpOutlined sx={{ fontSize: 18, color: '#2563EB' }} /> Quy định cấu trúc cột file Excel:
          </Typography>
          
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 1 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>Tên cột (Header)</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>Bắt buộc?</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>Mô tả & Giá trị mẫu</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>tai_khoan / username</TableCell>
                  <TableCell><Chip label="Bắt buộc" color="error" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Tên đăng nhập duy nhất (VD: <code style={{ color: '#0F172A' }}>nguyen_van_a</code>, <code style={{ color: '#0F172A' }}>hs2026001</code>)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>ho_ten / full_name</TableCell>
                  <TableCell><Chip label="Tùy chọn" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Họ và tên đầy đủ của học sinh (VD: <code style={{ color: '#0F172A' }}>Nguyễn Văn A</code>)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>email</TableCell>
                  <TableCell><Chip label="Bắt buộc" color="error" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Địa chỉ email hợp lệ của học sinh (VD: <code style={{ color: '#0F172A' }}>vana@school.edu.vn</code>)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>mat_khau / password</TableCell>
                  <TableCell><Chip label="Tùy chọn" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Mật khẩu khởi tạo ban đầu (Nếu để trống, hệ thống đặt mặc định: <code style={{ color: '#0F172A' }}>Student@123</code>)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>vai_tro / role</TableCell>
                  <TableCell><Chip label="Tùy chọn" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>Mặc định là <code style={{ color: '#0F172A' }}>student</code>. Có thể điền: student, teacher, admin</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Khu vực Upload / Kéo thả File */}
        <Box
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          sx={{
            p: 4,
            border: '2px dashed #CBD5E1',
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#2563EB',
              bgcolor: '#EFF6FF',
            },
          }}
        >
          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />
          <CloudUpload sx={{ fontSize: 48, color: '#2563EB', mb: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
            {selectedFileName ? `Đã chọn file: ${selectedFileName}` : 'Nhấn để chọn file Excel hoặc kéo thả vào đây'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Chấp nhận định dạng file Microsoft Excel (<code style={{ color: '#2563EB' }}>.xlsx</code>, <code style={{ color: '#2563EB' }}>.xls</code>)
          </Typography>
        </Box>

        {/* Trạng thái Loading / Thông báo kết quả */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
              Đang đọc và tạo tài khoản học sinh hàng loạt...
            </Typography>
          </Box>
        )}

        {errorMsg && (
          <Alert severity="warning" sx={{ borderRadius: 1.2 }}>
            {errorMsg}
          </Alert>
        )}

        {successMsg && (
          <Alert icon={<CheckCircle fontSize="inherit" />} severity="success" sx={{ borderRadius: 1.2 }}>
            {successMsg}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid #E2E8F0' }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1 }}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExcelUserImportDialog;
