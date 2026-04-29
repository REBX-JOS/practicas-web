import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ProductoCard } from '../producto-card/producto-card';
import { ProductsService } from '../../app/features/products';
import { CartService } from '../../app/features/cart';
import { Product } from '../../models/producto.model';
import { Cart, CartItem } from '../../models/cart.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-catalogo',
  imports: [ProductoCard],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly cart = signal<Cart>({
    id: 0,
    totalItems: 0,
    total: 0,
    items: [],
  });
  readonly cartLoading = signal(false);
  readonly cartError = signal('');

  readonly cartItems = computed(() => this.cart().items);
  readonly hasCartItems = computed(() => this.cartItems().length > 0);
  readonly cartTotal = computed(() => this.cart().total);
  readonly cartTotalItems = computed(() => this.cart().totalItems);

  ngOnInit(): void {
    this.loadProducts();
    this.loadCart();
  }

  onAddToCart(productId: number): void {
    this.cartLoading.set(true);
    this.cartError.set('');

    this.cartService.addItem(productId, 1).subscribe({
      next: (updatedCart) => {
        this.cart.set(updatedCart);
        this.cartLoading.set(false);
      },
      error: () => {
        this.cartLoading.set(false);
        this.cartError.set('No se pudo agregar el producto al carrito.');
      },
    });
  }

  updateQuantity(item: CartItem, delta: number): void {
    const nextQuantity = item.quantity + delta;
    this.cartLoading.set(true);
    this.cartError.set('');

    if (nextQuantity <= 0) {
      this.removeItem(item.productId);
      return;
    }

    this.cartService.updateItemQuantity(item.productId, nextQuantity).subscribe({
      next: (updatedCart) => {
        this.cart.set(updatedCart);
        this.cartLoading.set(false);
      },
      error: () => {
        this.cartLoading.set(false);
        this.cartError.set('No se pudo actualizar la cantidad.');
      },
    });
  }

  removeItem(productId: number): void {
    this.cartService.removeItem(productId).subscribe({
      next: (updatedCart) => {
        this.cart.set(updatedCart);
        this.cartLoading.set(false);
      },
      error: () => {
        this.cartLoading.set(false);
        this.cartError.set('No se pudo eliminar el producto del carrito.');
      },
    });
  }

  clearCart(): void {
    this.cartLoading.set(true);
    this.cartError.set('');

    this.cartService.clearCart().subscribe({
      next: (updatedCart) => {
        this.cart.set(updatedCart);
        this.cartLoading.set(false);
      },
      error: () => {
        this.cartLoading.set(false);
        this.cartError.set('No se pudo vaciar el carrito.');
      },
    });
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('es-MX')} MXN`;
  }

  private loadProducts(): void {
    this.productsService.getAll().subscribe({
      next: (prods) => {
        this.products.set(prods);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar el catalogo desde la base de datos.');
      },
    });
  }

  private loadCart(): void {
    this.cartLoading.set(true);
    this.cartService.getCart().subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.cartLoading.set(false);
      },
      error: () => {
        this.cartLoading.set(false);
        this.cartError.set('No se pudo cargar el carrito.');
      },
    });
  }
}