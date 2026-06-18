import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { ActivityLog, ActivityLogsResponse } from '../../models/activity-log.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  constructor(private api: ApiService) {}

  /**
   * Retorna os logs de atividade de um registro específico.
   * Ex: GET /api/activity-logs/financial_release/123
   */
  getLogsByRecord(type: string, id: number): Observable<ActivityLogsResponse> {
    return this.api.get<ActivityLogsResponse>(`activity-logs/${type}/${id}`);
  }

  /**
   * Logs de um lançamento financeiro.
   */
  getLogsByFinancialRelease(releaseId: number): Observable<ActivityLogsResponse> {
    return this.getLogsByRecord('financial_release', releaseId);
  }
}
