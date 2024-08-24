import { Component } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { UserService } from 'src/app/services/user/user.service';
import { AlertService } from 'src/app/shared/alert/alert.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm!: FormGroup
  // userToken: String

  constructor(
    private userService: UserService,
    private route: Router,
    private alertService: AlertService,
    private authSerice: AuthService
  ) { }

  ngOnInit(): void {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    })
  }

  get email() {
    return this.loginForm.get('email')!;
  }

  get password() {
    return this.loginForm.get('password')!;
  }

  onSubmit(FormGroupDirective: FormGroupDirective) {

    this.userService.login(this.loginForm.value).subscribe(
      response => {
        this.getInfoUser(response.token!)
      }, err => {
        console.log(err);
        this.alertService.alertWarning(err.error.message);
      }
   );
  }

  getInfoUser(userToken: string)
  {
    this.userService.me(userToken).subscribe(
      response => {
        this.userService.userAuthenticated(response, userToken);
      }
    );
  }
}
