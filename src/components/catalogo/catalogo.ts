import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  isLoading = true;

  constructor(
    private productsService: ProductsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    
    this.productsService.getAll().subscribe({
      next: (prods) => {
        this.products = prods;
        this.isLoading = false;
        
        // FORZAR la detección de cambios
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      /*complete: () => {
        console.log(' Subscribe COMPLETE ejecutado');
      }*/
    });
  }
}