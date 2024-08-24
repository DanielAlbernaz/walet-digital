import { Component } from '@angular/core';
import { FormGroup, FormGroupDirective, FormControl, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user/user.service';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/alert/alert.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm!: FormGroup

  constructor(
    private userService: UserService,
    private route: Router,
    private alertService: AlertService,
  ) { }

  ngOnInit(): void {
    this.registerForm = new FormGroup({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    })
  }

  get name() {
    return this.registerForm.get('name')!;
  }

  get email() {
    return this.registerForm.get('email')!;
  }

  get password() {
    return this.registerForm.get('password')!;
  }

  onSubmit(FormGroupDirective: FormGroupDirective) {
    this.userService.create(this.registerForm.value).subscribe(
      response => {
        this.alertService.alertSuccess('Usuário criado com sucesso!');
        this.route.navigate(['/login']);
      }, err => {
        this.alertService.alertWarning(err.error.message);
      }
   );
  }

}
