import { Component, Input } from '@angular/core';
import { Product } from '../../models/producto.model';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-producto-card',
  imports: [CurrencyPipe],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})

export class ProductoCard {
  @Input() product!: Product;
}
