import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  alertSuccess(message: String, showConfirmButton: boolean = false, timer: number = 1500) {
    Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: message,
      showConfirmButton: showConfirmButton,
      timer: timer
    })
  }

  alertWarning(message: String, title: String = 'Algo deu errado!') {
    Swal.fire({
      title: title,
      text: `${message}`,
      icon: 'warning',
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ok'
    }).then((result) => {
    })
  }
}
