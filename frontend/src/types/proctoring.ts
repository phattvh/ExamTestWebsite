export interface Violation {
  id: string;
  exam_id: string;
  exam_session_id?: string;
  user_id: string;
  username?: string;
  full_name?: string;
  ip?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  details?: any;
}

export interface RiskScore {
  user_id: string;
  score: number;
}

export interface StudentSession {
  user_id: string;
  full_name?: string;
  username?: string;
  ip?: string;
  is_online: boolean;
  violations_count: number;
  risk_score: number;
}

export interface ProctorAlert {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}
