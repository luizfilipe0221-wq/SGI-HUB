// Types for list generation
export interface ListBatch {
  id: string;
  user_id: string;
  name: string;
  generation_mode: 'auto' | 'manual';
  config_json: AutoGenerationConfig | ManualGenerationConfig;
  created_at: string;
}

export interface AutoGenerationConfig {
  mode: 'auto';
  lists_count: number;
  buildings_per_list: number;
  letters_per_building: number;
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  avoid_recent_days: number;
  priority_mode: 'expired' | 'least_recent' | 'balanced' | 'all';
  included_territories?: number[];
  excluded_territories?: number[];
}

export interface ManualGenerationConfig {
  mode: 'manual';
  lists_count: number;
  letters_per_building: number;
  letters_mode: 'PER_FLOOR' | 'PER_APARTMENT';
  avoid_recent_days: number;
  patterns: string[];
}

export interface GeneratedListWithBatch {
  id: string;
  user_id: string;
  name: string;
  batch_id: string | null;
  config_json: Record<string, unknown>;
  created_at: string;
  batch?: ListBatch;
}

export interface BatchWithLists extends ListBatch {
  lists: GeneratedListWithBatch[];
  total_buildings: number;
  completed_buildings: number;
}

// For undo system
export interface UndoAction {
  id: string;
  user_id: string;
  action_type: UndoActionType;
  entity_type: string;
  entity_id: string;
  previous_state: Record<string, unknown> | null;
  current_state: Record<string, unknown> | null;
  can_undo: boolean;
  created_at: string;
  expires_at: string | null;
}

export type UndoActionType = 
  | 'MARK_APARTMENT'
  | 'UNMARK_APARTMENT'
  | 'CREATE_SESSION'
  | 'COMPLETE_SESSION'
  | 'CANCEL_SESSION'
  | 'DELETE_SESSION'
  | 'REMOVE_APARTMENT_FROM_SESSION';

// Session with full details for editing
export interface SessionWithDetails {
  id: string;
  building_id: string;
  user_id: string;
  planned_count: number;
  completed_count: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  list_item_id: string | null;
  created_at: string;
  apartments: SessionApartmentDetail[];
  list_item?: {
    id: string;
    list_number: number;
    generated_list: {
      id: string;
      name: string;
    };
  };
}

export interface SessionApartmentDetail {
  id: string;
  apartment_id: string;
  completed_at: string | null;
  apartment: {
    id: string;
    apartment_number: string;
    letter_done: boolean;
    floor: {
      floor_label: string;
      floor_number: number;
    };
  };
}
