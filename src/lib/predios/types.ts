// Building types
export interface Building {
  id: string;
  user_id: string;
  territory_id: number;
  name: string;
  address: string;
  floors_count: number;
  apartments_per_floor: number | null;
  apartments_total: number | null;
  notes: string | null;
  default_cycle_days: number;
  custom_cycle_days: number | null;
  last_worked_at: string | null;
  last_letter_sent_at: string | null;
  progress_floors_done: number;
  progress_apartments_done: number;
  created_at: string;
  updated_at: string;
  // New columns for unit generation
  units_generated: boolean;
  units_generated_at: string | null;
  units_generated_by: string | null;
  numbering_starts_at: number;
  apartments_per_floor_config: number | null;
}

export interface BuildingWithStatus extends Building {
  due_date: Date | null;
  days_until_due: number;
  status: 'expired' | 'warning' | 'success' | 'completed' | 'not_started';
  status_label: string;
  // Apartment-based progress
  total_apartments: number;
  done_apartments: number;
  last_letter_done_at: string | null;
}

export interface Territory {
  id: number;
  name: string | null;
  user_id: string;
  created_at: string;
}

export interface TerritoryWithStats extends Territory {
  buildings_count: number;
  expired_count: number;
}

export interface BuildingActivityLog {
  id: string;
  building_id: string;
  user_id: string;
  activity_type: 'WORKED' | 'LETTER_SENT' | 'NOTE' | 'PROGRESS_UPDATE';
  activity_date: string;
  letters_count: number | null;
  notes: string | null;
  created_at: string;
}

export interface GeneratedList {
  id: string;
  user_id: string;
  name: string;
  config_json: ListConfig;
  created_at: string;
}

export interface ListPatternConfig {
  list_number: number;
  territory_pattern: number[];
  fallback_used?: boolean;
  fallback_territories?: number[];
}

export interface ListConfig {
  lists_count: number;
  per_list: number;
  // Legacy single pattern (for backwards compatibility)
  territory_pattern?: number[];
  // New: individual patterns per list
  patterns_per_list?: ListPatternConfig[];
  avoid_recent_days: number;
  prioritize_mode: 'expired';
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  letters_planned: number;
}

export interface GeneratedListItem {
  id: string;
  generated_list_id: string;
  user_id: string;
  list_number: number;
  position_in_list: number;
  building_id: string;
  letters_planned: number;
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  snapshot_last_letter_sent_at: string | null;
  snapshot_due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_letters_count: number;
  created_at: string;
  building?: Building;
}
