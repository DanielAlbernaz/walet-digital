import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../../services/category/category.service';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../../models/category.model';
import { ToastrService } from 'ngx-toastr';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-category-modal',
  templateUrl: './category-modal.component.html',
  styleUrls: ['./category-modal.component.scss']
})
export class CategoryModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() categoryToEdit: Category | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  categoryForm: FormGroup;
  faTimes = faTimes;
  isLoading: boolean = false;

  typeOptions = [
    { value: 'revenue', label: 'Receita' },
    { value: 'expense', label: 'Despesa' }
  ];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private toastr: ToastrService
  ) {
    this.categoryForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['expense', Validators.required],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    if (this.categoryToEdit) {
      this.populateForm(this.categoryToEdit);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryToEdit'] && this.categoryToEdit) {
      this.populateForm(this.categoryToEdit);
    } else if (changes['isOpen'] && this.isOpen && !this.categoryToEdit) {
      this.categoryForm.reset({
        title: '',
        type: 'expense',
        is_active: true
      });
    }
  }

  populateForm(category: Category): void {
    // Normalizar type para 'revenue' ou 'expense'
    let type = category.type;
    if (type === 'receita') type = 'revenue';
    if (type === 'despesa') type = 'expense';

    this.categoryForm.patchValue({
      title: category.title,
      type: type,
      is_active: category.is_active !== undefined ? category.is_active : true
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onToggleChange(event: any): void {
    const isChecked = event.target.checked;
    this.categoryForm.patchValue({ is_active: isChecked }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }

    this.isLoading = true;
    const formValue = this.categoryForm.value;

    if (this.categoryToEdit) {
      const updateData: UpdateCategoryRequest = {
        title: formValue.title,
        type: formValue.type,
        is_active: formValue.is_active
      };

      this.categoryService.update(this.categoryToEdit.id, updateData).subscribe({
        next: () => {
          this.toastr.success('Categoria atualizada com sucesso.', 'Sucesso');
          this.isLoading = false;
          this.saved.emit();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 422) {
            const errorMessage = error.error?.message || error.error?.error || 'Erro de validação.';
            if (errorMessage.includes('lançamentos')) {
              this.toastr.error(errorMessage, 'Erro');
            } else {
              const errors = error.error?.errors || {};
              const firstError = Object.values(errors)[0];
              this.toastr.error(Array.isArray(firstError) ? firstError[0] : errorMessage, 'Erro');
            }
          } else if (error.status === 403) {
            this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
          } else {
            this.toastr.error('Erro ao atualizar categoria.', 'Erro');
          }
        }
      });
    } else {
      const createData: CreateCategoryRequest = {
        title: formValue.title,
        type: formValue.type,
        is_active: formValue.is_active !== undefined ? formValue.is_active : true
      };

      this.categoryService.create(createData).subscribe({
        next: () => {
          this.toastr.success('Categoria criada com sucesso.', 'Sucesso');
          this.isLoading = false;
          this.saved.emit();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 422) {
            const errorMessage = error.error?.message || error.error?.error || 'Erro de validação.';
            if (errorMessage.includes('lançamentos')) {
              this.toastr.error(errorMessage, 'Erro');
            } else {
              const errors = error.error?.errors || {};
              const firstError = Object.values(errors)[0];
              this.toastr.error(Array.isArray(firstError) ? firstError[0] : errorMessage, 'Erro');
            }
          } else if (error.status === 403) {
            this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
          } else {
            this.toastr.error('Erro ao criar categoria.', 'Erro');
          }
        }
      });
    }
  }

  get isEditing(): boolean {
    return !!this.categoryToEdit;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
