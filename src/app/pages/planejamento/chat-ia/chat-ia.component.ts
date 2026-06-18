import { Component } from '@angular/core';
import { faRobot, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons';
import { PlanningAiService } from '../../../services/planning/planning-ai.service';
import { AiMessage, AiPeriod } from '../../../models/planning/planning.model';

@Component({
  selector: 'app-chat-ia',
  template: `
    <div class="chat">
      <div class="chat-header">
        <fa-icon [icon]="faRobot"></fa-icon>
        <div>
          <strong>IA Financeira</strong>
          <p>Analiso seus dados e te ajudo a decidir. Orientação informativa, não consultoria regulamentada.</p>
        </div>
        <select [(ngModel)]="period" class="period-select">
          <option value="3m">Últimos 3 meses</option>
          <option value="6m">Últimos 6 meses</option>
          <option value="12m">Últimos 12 meses</option>
        </select>
      </div>

      <div class="chat-body">
        <div class="suggestions" *ngIf="messages.length === 0">
          <button *ngFor="let s of suggestions" class="suggestion" (click)="send(s)">{{ s }}</button>
        </div>

        <div class="msg" *ngFor="let m of messages" [ngClass]="m.role">
          <div class="msg-avatar"><fa-icon [icon]="m.role === 'user' ? faUser : faRobot"></fa-icon></div>
          <div class="msg-bubble">{{ m.content }}</div>
        </div>

        <div class="msg assistant" *ngIf="isTyping">
          <div class="msg-avatar"><fa-icon [icon]="faRobot"></fa-icon></div>
          <div class="msg-bubble typing">Analisando seus dados…</div>
        </div>
      </div>

      <form class="chat-input" (ngSubmit)="send(draft)">
        <input [(ngModel)]="draft" name="draft" placeholder="Pergunte algo sobre suas finanças…" autocomplete="off" [disabled]="isTyping"/>
        <button type="submit" [disabled]="!draft.trim() || isTyping"><fa-icon [icon]="faPaperPlane"></fa-icon></button>
      </form>
    </div>
  `,
  styles: [`
    .chat { display: flex; flex-direction: column; height: calc(100vh - 320px); min-height: 420px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    .chat-header { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border); }
    .chat-header > fa-icon { font-size: 22px; color: #7c3aed; }
    .chat-header strong { color: var(--foreground); }
    .chat-header p { margin: 2px 0 0; font-size: 12px; color: var(--muted-foreground, #6b7280); }
    .period-select { margin-left: auto; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 13px; }
    .chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .suggestions { display: flex; flex-wrap: wrap; gap: 8px; }
    .suggestion { padding: 8px 14px; border-radius: 20px; border: 1px solid var(--border); background: var(--accent, #f8fafc); color: var(--foreground); font-size: 13px; cursor: pointer; }
    .suggestion:hover { border-color: #7c3aed; }
    .msg { display: flex; gap: 10px; max-width: 85%; }
    .msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .msg-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--accent, #f1f5f9); color: var(--foreground); flex-shrink: 0; }
    .msg.assistant .msg-avatar { background: #7c3aed; color: #fff; }
    .msg-bubble { padding: 12px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; background: var(--accent, #f1f5f9); color: var(--foreground); }
    .msg.user .msg-bubble { background: #2563eb; color: #fff; }
    .msg-bubble.typing { font-style: italic; opacity: 0.7; }
    .chat-input { display: flex; gap: 10px; padding: 14px; border-top: 1px solid var(--border); }
    .chat-input input { flex: 1; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); font-size: 14px; }
    .chat-input button { width: 46px; border: none; border-radius: 10px; background: #2563eb; color: #fff; cursor: pointer; }
    .chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ChatIaComponent {
  faRobot = faRobot;
  faPaperPlane = faPaperPlane;
  faUser = faUser;

  draft = '';
  period: AiPeriod = '3m';
  isTyping = false;
  messages: AiMessage[] = [];
  conversationId?: number;

  suggestions = [
    'Estou gastando demais?',
    'Quais gastos devo cortar?',
    'Posso comprar um celular de R$ 3.000?',
    'Quando conseguirei quitar minhas dívidas?'
  ];

  constructor(private aiService: PlanningAiService) {}

  send(text: string): void {
    const question = (text || '').trim();
    if (!question || this.isTyping) return;

    this.messages.push({ role: 'user', content: question });
    this.draft = '';
    this.isTyping = true;

    this.aiService.ask(question, this.period, this.conversationId).subscribe({
      next: (res) => {
        this.conversationId = res.conversationId;
        this.messages.push({ role: 'assistant', content: res.answer });
        this.isTyping = false;
      },
      error: () => {
        this.messages.push({ role: 'assistant', content: 'Não consegui responder agora. Tente novamente.' });
        this.isTyping = false;
      }
    });
  }
}
