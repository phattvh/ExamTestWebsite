import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Card, CardContent, Alert } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

const CameraTest: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError') {
        setError('Quyền truy cập camera bị từ chối. Vui lòng cấp quyền để tiếp tục.');
      } else if (err.name === 'NotFoundError') {
        setError('Không tìm thấy thiết bị camera.');
      } else {
        setError('Lỗi không xác định khi truy cập camera.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element when stream or ref changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom align="center">
          Kiểm tra Camera (WebRTC PoC)
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box 
            sx={{ 
              width: '100%', 
              height: 300, 
              bgcolor: 'black', 
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {stream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Typography color="white">Camera đang tắt</Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<VideocamIcon />}
            onClick={startCamera}
            disabled={!!stream}
          >
            Bật Camera
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            startIcon={<VideocamOffIcon />}
            onClick={stopCamera}
            disabled={!stream}
          >
            Tắt Camera
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CameraTest;
