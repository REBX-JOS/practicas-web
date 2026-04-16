import { Component, computed, input, output } from '@angular/core';
import { Product } from '../../models/producto.model';

@Component({
  selector: 'app-producto-card',
  imports: [],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  readonly product = input.required<Product>();
  readonly addToCart = output<number>();

  readonly formattedPrice = computed(() => {
    const amount = this.product().price;
    return `$${amount.toLocaleString('es-MX')} MXN`;
  });

  onAddToCart(): void {
    this.addToCart.emit(this.product().id);
  }
}