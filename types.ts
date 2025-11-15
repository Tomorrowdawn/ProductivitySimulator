export enum MemberStatus {
  IDLE = 'Idle',
  WAITING = 'Waiting',
  WORKING = 'Working',
}

export interface TeamMember {
  id: number;
  outputRate: number; // Oi
  ideaProbability: number; // Pi (0 to 1)
  status: MemberStatus;
  resourceHeldSince: number; // Day number
  daysWithResource: number;
}

export interface SimulationParams {
  teamSize: number; // N
  resources: number; // R
  minHoldTime: number; // K
  duration: number; // days
  defaultIdeaProbability: number;
  members: Array<{ outputRate: number; }>;
}

export interface SimulationState {
  day: number;
  team: TeamMember[];
  queue: number[]; // Array of member IDs
  working: number[]; // Array of member IDs
  totalOutput: number;
}

export interface SimulationResult {
  totalOutput: number;
  averageOutput: number;
  resourceUtilization: number;
}


// New types for statistical analysis
export interface AnalysisDataPoint {
  x: number;
  y: number;
}

export interface AnalysisResult {
  label: string;
  data: AnalysisDataPoint[];
}

export enum AnalysisType {
    PRODUCTIVITY_CURVE = 'PRODUCTIVITY_CURVE',
    SATURATION_ANALYSIS = 'SATURATION_ANALYSIS',
}