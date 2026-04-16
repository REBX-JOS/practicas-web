import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Cart } from '../models/cart.model';

const API_BASE_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  getCart(): Observable<Cart> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ id: 0, totalItems: 0, total: 0, items: [] });
    }

    return this.http.get<Cart>(`${API_BASE_URL}/cart`);
  }

  addItem(productId: number, quantity = 1): Observable<Cart> {
    return this.http.post<Cart>(`${API_BASE_URL}/cart/items`, { productId, quantity });
  }

  updateItemQuantity(productId: number, quantity: number): Observable<Cart> {
    return this.http.patch<Cart>(`${API_BASE_URL}/cart/items/${productId}`, { quantity });
  }

  removeItem(productId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${API_BASE_URL}/cart/items/${productId}`);
  }

  clearCart(): Observable<Cart> {
    return this.http.delete<Cart>(`${API_BASE_URL}/cart/items`);
  }
}
