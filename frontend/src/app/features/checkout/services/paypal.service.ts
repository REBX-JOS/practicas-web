import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../environments/environments';
import { CartItem } from '../../../../models/cart.model';

@Injectable({providedIn: 'root'})

export class PaypalService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/paypal`;

        crearOrden(payload: { cartId: number; items: CartItem[]; total: number }) {
        return this.http.post<{id:string, status:string}>(`${this.apiUrl}/create-order`, payload);
    }

    capturarOrden(orderId: string) {
        return this.http.post<{status: string}>(`${this.apiUrl}/capture-order`, {orderId});
    }

    descargarReciboXml(orderId: string) {
        return this.http.get(`${this.apiUrl}/orders/${orderId}/receipt.xml`, {
            responseType: 'blob',
        });
    }

        obtenerEstadoOrden(orderId: string) {
            return this.http.get<{
                orderId: string;
                captureId: string | null;
                status: string;
                payerEmail: string | null;
                amount: number;
                currencyCode: string;
                cartId: number | null;
            }>(`${this.apiUrl}/orders/${orderId}`);
        }
}
