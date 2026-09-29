import React from 'react';
import { Box, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface TimerProps {
  timeLeft: number;
  isWarning: boolean;
  formattedTime: string;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, isWarning, formattedTime }) => {
  let textColor = '#059669';
  let bgColor = '#ECFDF5';
  let borderColor = '#A7F3D0';

  if (timeLeft <= 60) {
    textColor = '#DC2626';
    bgColor = '#FEF2F2';
    borderColor = '#FECACA';
  } else if (isWarning) {
    textColor = '#D97706';
    bgColor = '#FFFBEB';
    borderColor = '#FDE68A';
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.8,
        borderRadius: 3,
        bgcolor: bgColor,
        color: textColor,
        border: `1.5px solid ${borderColor}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <AccessTimeIcon sx={{ fontSize: 20, animation: isWarning ? 'pulse 1s infinite' : 'none' }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1, lineHeight: 1 }}>
        {formattedTime}
      </Typography>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
};

export default Timer;
