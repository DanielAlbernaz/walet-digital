import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { faChevronLeft, faChevronRight, faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-month-selector',
  templateUrl: './month-selector.component.html',
  styleUrls: ['./month-selector.component.scss']
})
export class MonthSelectorComponent implements OnInit {
  currentMonth: Date = new Date(); // Inicializar com o mês atual
  @Output() monthChanged = new EventEmitter<Date>();

  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faCalendar = faCalendar;

  ngOnInit(): void {
    // Emitir o mês atual ao inicializar
    this.emitMonthChange();
  }

  private emitMonthChange(): void {
    this.monthChanged.emit(this.currentMonth);
  }

  getMonthYear(): string {
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${months[this.currentMonth.getMonth()]} de ${this.currentMonth.getFullYear()}`;
  }

  prevMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.emitMonthChange();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.emitMonthChange();
  }

  currentMonthClick(): void {
    this.currentMonth = new Date();
    this.emitMonthChange();
  }
}
