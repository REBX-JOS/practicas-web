import {Injectable} from '@angular/core';
import {Product} from '../models/producto.model';
@Injectable ({providedIn:'root'})
export class ProductsService {
	private readonly products: Product[]=[
		{
	 		id:1,
			name: 'Audifonos',
			price: 599,
			imageUrl: 'ruta-imagen',
			category: 'Audio',
			description: 'Audifonos inalambricos',
			inStock: true,
		},
	];

	get getAll(): Product[]{
		return this.products;
	}

}
