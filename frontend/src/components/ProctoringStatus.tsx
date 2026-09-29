import React from 'react';
import { Box, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';

interface ProctoringStatusProps {
  isActive: boolean;
  violationCount: number;
}

const ProctoringStatus: React.FC<ProctoringStatusProps> = ({ violationCount }) => {
  const hasWarning = violationCount > 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <VideocamIcon color={hasWarning ? 'error' : 'success'} />
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: hasWarning ? 'error.main' : 'success.main',
        }}
      />
      <Typography variant="body2" color={hasWarning ? 'error.main' : 'text.primary'}>
        {hasWarning ? `Cảnh báo (${violationCount})` : 'Đang giám sát'}
      </Typography>
    </Box>
  );
};

export default ProctoringStatus;
