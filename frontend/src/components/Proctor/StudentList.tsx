import { Grid } from '@mui/material';
import StudentCard from './StudentCard';
import type { StudentSession } from '../../types/proctoring';
import { Box, Typography } from '@mui/material';

interface StudentListProps {
  students: StudentSession[];
  examId?: string;
  onRequestStream?: (userId: string, type?: 'camera' | 'screen' | 'both') => void;
  onStopStream?: (userId: string) => void;
  streams?: Record<string, MediaStream>;
  frames?: Record<string, string>;
}

const StudentList = ({ students, examId, onRequestStream, onStopStream, streams, frames }: StudentListProps) => {
  if (students.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="text.secondary">Không có học sinh nào trong phiên thi này.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {students.map((student) => {
        const studentFrame = frames?.[student.user_id] || frames?.[String(student.user_id)];
        return (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={student.user_id}>
            <StudentCard
              student={student}
              examId={examId}
              onRequestStream={onRequestStream}
              onStopStream={onStopStream}
              stream={streams?.[student.user_id]}
              frame={studentFrame}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default StudentList;
