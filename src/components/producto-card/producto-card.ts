import { Component, Input } from '@angular/core';
import { Product } from '../../models/producto.model';

@Component({
  selector: 'app-producto-card',
  imports: [],
  standalone: true,
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  @Input() product!: Product;

  get formattedPrice(): string {
    return `$${this.product.price.toLocaleString('es-MX')} MXN`;
  }
}