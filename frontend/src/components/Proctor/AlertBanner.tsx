import { Snackbar, Alert } from '@mui/material';
import type { ProctorAlert } from '../../types/proctoring';
import { useEffect, useState } from 'react';

interface AlertBannerProps {
  alerts: ProctorAlert[];
  onClearAlerts: () => void;
}

const AlertBanner = ({ alerts, onClearAlerts }: AlertBannerProps) => {
  const [open, setOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<ProctorAlert | null>(null);

  useEffect(() => {
    if (alerts.length > 0) {
      const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
      if (highSeverityAlerts.length > 0) {
        setCurrentAlert(highSeverityAlerts[highSeverityAlerts.length - 1]);
        setOpen(true);
      }
    }
  }, [alerts]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    onClearAlerts();
  };

  return (
    <Snackbar open={open} autoHideDuration={6000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert onClose={handleClose} severity="error" variant="filled" sx={{ width: '100%' }}>
        {currentAlert?.message || 'High severity alert detected!'}
      </Alert>
    </Snackbar>
  );
};

export default AlertBanner;
