import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CartService } from '../../app/features/cart';
import { PaypalService } from '../../app/features/checkout';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Cart } from '../../models/cart.model';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environments';

declare const paypal: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent implements OnInit, AfterViewInit {
  @ViewChild('paypalButtonContainer')
  set paypalButtonContainerRef(value: ElementRef<HTMLDivElement> | undefined) {
    this.paypalButtonContainer = value;
    this.tryRenderPaypalButton();
  }

  private paypalButtonContainer?: ElementRef<HTMLDivElement>;

  private readonly carritoService = inject(CartService);
  private readonly paypalService = inject(PaypalService);

  readonly cart = signal<Cart>({ id: 0, totalItems: 0, total: 0, items: [] });
  readonly isLoading = signal(true);
  readonly mensaje = signal('');

  readonly cartItems = computed(() => this.cart().items);
  readonly cartTotal = computed(() => this.cart().total);
  readonly hasItems = computed(() => this.cartItems().length > 0);

  private viewReady = false;
  private paypalSdkReady = false;
  private paypalRendered = false;

  ngOnInit(): void {
    this.carritoService.getCart().subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.isLoading.set(false);
        this.tryRenderPaypalButton();
      },
      error: () => {
        this.mensaje.set('Error al cargar el carrito.');
        this.isLoading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;

    this.loadPaypalSdk()
      .then(() => {
        this.paypalSdkReady = true;
        this.tryRenderPaypalButton();
      })
      .catch(() => {
        this.mensaje.set('No se pudo cargar el SDK de PayPal.');
      });
  }

  private loadPaypalSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof paypal !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=MXN`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal'));
      document.body.appendChild(script);
    });
  }

  private renderPaypalButton(): void {
    if (!this.hasItems()) {
      return;
    }

    if (typeof paypal === 'undefined') {
      this.mensaje.set('No se cargó el SDK de PayPal.');
      return;
    }

    if (!this.paypalButtonContainer) {
      return;
    }

    this.paypalButtonContainer.nativeElement.innerHTML = '';

    paypal
      .Buttons({
        createOrder: async () => {
          try {
            const response = await firstValueFrom(
              this.paypalService.crearOrden({
                cartId: this.cart().id,
                items: this.cartItems(),
                total: this.cartTotal(),
              })
            );
            return response.id;
          } catch (error) {
            console.error('Error al crear la orden:', error);
            this.mensaje.set('No se pudo crear la orden.');
            throw error;
          }
        },

        onApprove: async (data: any) => {
          try {
            await firstValueFrom(
              this.paypalService.capturarOrden(data.orderID)
            );

            this.mensaje.set('Pago capturado correctamente. Generando recibo XML...');

            try {
              const xmlBlob = await firstValueFrom(this.paypalService.descargarReciboXml(data.orderID));
              this.downloadBlob(xmlBlob, `recibo-${data.orderID}.xml`);
              this.mensaje.set('Pago capturado correctamente. Recibo XML descargado.');
            } catch (receiptError) {
              console.error('No se pudo descargar el XML tras el pago:', receiptError);
              this.mensaje.set('Pago capturado correctamente, pero no se pudo descargar el XML.');
            }

            const updatedCart = await firstValueFrom(this.carritoService.getCart());
            this.cart.set(updatedCart);
            if (this.paypalButtonContainer) {
              this.paypalButtonContainer.nativeElement.innerHTML = '';
            }
          } catch (error) {
            console.error('Error al capturar el pago:', error);
            this.mensaje.set('Ocurrió un error al capturar el pago.');
          }
        },

        onCancel: () => {
          this.mensaje.set('El usuario canceló el pago.');
        },

        onError: (error: any) => {
          console.error('Error PayPal:', error);
          this.mensaje.set('Error en el proceso de PayPal.');
        },
      })
      .render(this.paypalButtonContainer.nativeElement);

    this.paypalRendered = true;
  }

  private tryRenderPaypalButton(): void {
    if (!this.viewReady || !this.paypalSdkReady || this.paypalRendered || !this.hasItems()) {
      return;
    }

    this.renderPaypalButton();
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }
}
