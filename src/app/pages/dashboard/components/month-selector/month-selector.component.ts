import { Component } from '@angular/core';
import { faChevronLeft, faChevronRight, faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-month-selector',
  templateUrl: './month-selector.component.html',
  styleUrls: ['./month-selector.component.scss']
})
export class MonthSelectorComponent {
  currentMonth: Date = new Date(2026, 0, 1); // Janeiro 2026

  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faCalendar = faCalendar;

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
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
  }

  currentMonthClick(): void {
    this.currentMonth = new Date();
  }
}
