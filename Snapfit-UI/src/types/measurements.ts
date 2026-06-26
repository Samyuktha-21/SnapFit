export interface BodyMeasurements {
  shoulderWidth: number;
  chestWidth: number; // Represents chest width for Men, bust width for Women
  waistWidth: number;
  hipWidth: number;
  confidence: number;
  size: string;
}

export interface ScanHistoryItem {
  id: string;
  date: string;
  shoulder_width_cm: number;
  chest_or_bust_cm: number;
  waist_cm: number;
  hip_cm: number;
  confidence: number;
  recommended_size: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  gender: 'Men' | 'Women';
  height_cm: number;
  shoulder_width_cm?: number;
  chest_or_bust_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  confidence?: number;
  is_premium: boolean;
  scan_history: ScanHistoryItem[];
}
