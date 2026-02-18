import { Component, OnInit } from '@angular/core';
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
export class Catalogo implements OnInit {
  products: Product[] = [];
  isLoading: boolean = true;

  constructor(private productsService: ProductsService) {}

  ngOnInit(): void {
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }
}