import { Box, Chip } from '@mui/material';

interface RiskIndicatorProps {
  score: number;
}

const RiskIndicator = ({ score }: RiskIndicatorProps) => {
  let color: 'success' | 'warning' | 'error' = 'success';
  let label = 'Low Risk';

  if (score >= 30) {
    color = 'error';
    label = 'High Risk';
  } else if (score >= 15) {
    color = 'warning';
    label = 'Medium Risk';
  }

  return (
    <Box>
      <Chip label={`${label} (${score})`} color={color} size="small" />
    </Box>
  );
};

export default RiskIndicator;
