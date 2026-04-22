import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Product } from '../models/producto.model';

const API_BASE_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  getAll(): Observable<Product[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    return this.http.get<Product[]>(`${API_BASE_URL}/products`);
  }
}