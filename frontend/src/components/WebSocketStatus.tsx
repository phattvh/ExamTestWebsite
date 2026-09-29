import React from 'react';
import { Box, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';

interface WebSocketStatusProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ status }) => {
  let color = 'error.main';
  let text = 'Mất kết nối';

  if (status === 'connected') {
    color = 'success.main';
    text = 'Đã kết nối';
  } else if (status === 'connecting') {
    color = 'warning.main';
    text = 'Đang kết nối...';
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WifiIcon sx={{ color }} />
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
};

export default WebSocketStatus;
