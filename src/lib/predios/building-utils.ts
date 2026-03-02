import { Building, BuildingWithStatus } from './types';
import { differenceInDays, addDays, parseISO } from 'date-fns';

export interface ApartmentStats {
  total: number;
  done: number;
  lastDoneAt: string | null;
}

/**
 * Calculate building status based on apartment letter delivery.
 * 
 * New logic:
 * - If all apartments are done: status = 'completed'
 * - If no apartments are done: status = 'not_started' 
 * - Otherwise: calculate due date from last letter + cycle days
 */
export function calculateBuildingStatus(
  building: Building, 
  apartmentStats?: ApartmentStats
): BuildingWithStatus {
  const cycleDays = building.custom_cycle_days ?? building.default_cycle_days;
  
  // Default apartment stats if not provided
  const stats = apartmentStats || { total: 0, done: 0, lastDoneAt: null };
  
  // If no units generated yet, use legacy behavior with building-level data
  if (stats.total === 0) {
    return calculateLegacyStatus(building, cycleDays, stats);
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // CASE 1: All apartments completed - building is done for this cycle
  if (stats.done >= stats.total) {
    return {
      ...building,
      due_date: null,
      days_until_due: Infinity,
      status: 'completed',
      status_label: 'Ciclo concluído',
      total_apartments: stats.total,
      done_apartments: stats.done,
      last_letter_done_at: stats.lastDoneAt,
    };
  }
  
  // CASE 2: No work started yet
  if (stats.done === 0 || !stats.lastDoneAt) {
    // Calculate from building creation date
    const baseDate = parseISO(building.created_at);
    const dueDate = addDays(baseDate, cycleDays);
    const daysUntilDue = differenceInDays(dueDate, today);
    
    return {
      ...building,
      due_date: dueDate,
      days_until_due: daysUntilDue,
      status: 'not_started',
      status_label: 'Não iniciado',
      total_apartments: stats.total,
      done_apartments: stats.done,
      last_letter_done_at: null,
    };
  }
  
  // CASE 3: Work in progress - calculate from last letter delivered
  const lastLetterDate = parseISO(stats.lastDoneAt);
  const dueDate = addDays(lastLetterDate, cycleDays);
  const daysUntilDue = differenceInDays(dueDate, today);
  
  let status: 'expired' | 'warning' | 'success';
  let statusLabel: string;
  
  if (daysUntilDue < 0) {
    status = 'expired';
    statusLabel = `Vencido há ${Math.abs(daysUntilDue)} dias`;
  } else if (daysUntilDue <= 7) {
    status = 'warning';
    statusLabel = daysUntilDue === 0 ? 'Vence hoje' : `Vence em ${daysUntilDue} dias`;
  } else {
    status = 'success';
    statusLabel = `Em dia (${daysUntilDue} dias)`;
  }
  
  return {
    ...building,
    due_date: dueDate,
    days_until_due: daysUntilDue,
    status,
    status_label: statusLabel,
    total_apartments: stats.total,
    done_apartments: stats.done,
    last_letter_done_at: stats.lastDoneAt,
  };
}

/**
 * Legacy calculation for buildings without generated units.
 * Uses building.last_letter_sent_at as fallback.
 */
function calculateLegacyStatus(
  building: Building, 
  cycleDays: number,
  stats: ApartmentStats
): BuildingWithStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Base date: last_letter_sent_at or created_at
  const baseDate = building.last_letter_sent_at 
    ? parseISO(building.last_letter_sent_at)
    : parseISO(building.created_at);
  
  const dueDate = addDays(baseDate, cycleDays);
  const daysUntilDue = differenceInDays(dueDate, today);
  
  let status: 'expired' | 'warning' | 'success';
  let statusLabel: string;
  
  if (daysUntilDue < 0) {
    status = 'expired';
    statusLabel = `Vencido há ${Math.abs(daysUntilDue)} dias`;
  } else if (daysUntilDue <= 7) {
    status = 'warning';
    statusLabel = daysUntilDue === 0 ? 'Vence hoje' : `Vence em ${daysUntilDue} dias`;
  } else {
    status = 'success';
    statusLabel = `Em dia (${daysUntilDue} dias)`;
  }
  
  return {
    ...building,
    due_date: dueDate,
    days_until_due: daysUntilDue,
    status,
    status_label: statusLabel,
    total_apartments: stats.total,
    done_apartments: stats.done,
    last_letter_done_at: stats.lastDoneAt,
  };
}

export function sortBuildingsByPriority(buildings: BuildingWithStatus[]): BuildingWithStatus[] {
  return [...buildings].sort((a, b) => {
    // Completed buildings last
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    
    // Expired first (most overdue first)
    if (a.status === 'expired' && b.status !== 'expired') return -1;
    if (b.status === 'expired' && a.status !== 'expired') return 1;
    
    // Warning before success/not_started
    if (a.status === 'warning' && b.status !== 'warning' && b.status !== 'expired') return -1;
    if (b.status === 'warning' && a.status !== 'warning' && a.status !== 'expired') return 1;
    
    // Then by days until due (ascending)
    if (a.days_until_due === Infinity && b.days_until_due === Infinity) return 0;
    if (a.days_until_due === Infinity) return 1;
    if (b.days_until_due === Infinity) return -1;
    
    return a.days_until_due - b.days_until_due;
  });
}

export function getTotalApartments(building: Building): number | null {
  if (building.apartments_total) {
    return building.apartments_total;
  }
  if (building.apartments_per_floor && building.floors_count) {
    return building.apartments_per_floor * building.floors_count;
  }
  return null;
}

export function getProgressPercentage(building: Building | BuildingWithStatus): number {
  // Use new apartment-based progress if available
  if ('total_apartments' in building && building.total_apartments > 0) {
    return Math.min(100, (building.done_apartments / building.total_apartments) * 100);
  }
  
  const total = getTotalApartments(building);
  if (!total || total === 0) {
    // If no apartments, use floors progress
    if (building.floors_count === 0) return 0;
    return Math.min(100, (building.progress_floors_done / building.floors_count) * 100);
  }
  return Math.min(100, (building.progress_apartments_done / total) * 100);
}
