import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-financial-search-bar',
  templateUrl: './financial-search-bar.component.html',
  styleUrls: ['./financial-search-bar.component.css']
})
export class FinancialSearchBarComponent {
  @Input() placeholder: string = 'Buscar...';
  @Input() searchQuery: string = '';
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() filterClick = new EventEmitter<void>();

  faSearch = faSearch;
  faFilter = faFilter;

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchQueryChange.emit(value);
  }

  onFilterButtonClick(): void {
    this.filterClick.emit();
  }
}
