import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../services/user/user.service';

@Injectable({
  providedIn: 'root'
})
class AuthGuard {

  constructor(
    private userService: UserService,
    private route: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) : Observable<boolean> | boolean {
    // console.log('aqui')
    if (this.userService.userIsAuthenticated()) {
      console.log(this.userService.userIsAuthenticated())
      console.log('foi auntenticado')
      return true;
    }
    console.log('ta false')
    // console.log('aqui')
    // console.log(this.userService.userIsAuthenticated())
    // console.log('aqui')
    this.route.navigate(['login']);

    return false;
  }

}

export const IsAdminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  console.log('aqui')
  return inject(AuthGuard).canActivate(route, state)
}
