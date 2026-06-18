import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../api/api.service';
import { AiPeriod } from '../../models/planning/planning.model';
import { mockAiAnswer } from './planning.mock';

@Injectable({ providedIn: 'root' })
export class PlanningAiService {
  // Camada de IA (OpenAI) implementada no backend. Mantenha `true` apenas
  // para demonstração offline com respostas mock.
  private useMock = false;

  constructor(private api: ApiService) {}

  /**
   * Envia uma pergunta à IA financeira. O backend monta o "dossiê de fatos"
   * determinístico e a IA apenas narra/aconselha em cima dele.
   */
  ask(question: string, period: AiPeriod = '3m', conversationId?: number): Observable<{ answer: string; conversationId: number }> {
    if (this.useMock) {
      return of({ answer: mockAiAnswer(question), conversationId: conversationId || 1 }).pipe(delay(600));
    }
    const id = conversationId ?? 0;
    return this.api.post<{ answer: string; conversationId: number }>(
      `planning/ai/conversations/${id}/messages`,
      { question, period }
    );
  }
}
