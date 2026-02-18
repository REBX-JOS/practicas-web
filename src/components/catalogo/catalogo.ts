import { Component } from '@angular/core';
import { ProductoCard } from '../producto-card/producto-card';
import { ProductsService } from '../../services/producto.service';
import { Product } from '../../models/producto.model';

@Component({
  selector: 'app-catalogo',
  imports: [ProductoCard],
  standalone: true,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})

export class Catalogo {
  products: Product[] = [];
  
  constructor(private productsService: ProductsService) {
    this.products = this.productsService.getAll; 
  }
}