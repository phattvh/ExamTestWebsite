import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4, textAlign: 'center', mt: 10 }}>
      <Typography variant="h3" color="error" gutterBottom>
        403 - Unauthorized
      </Typography>
      <Typography variant="h6" gutterBottom>
        You do not have permission to access this page.
      </Typography>
      <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Box>
  );
};

export default Unauthorized;
