import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoCard } from './producto-card';

describe('ProductoCard', () => {
  let component: ProductoCard;
  let fixture: ComponentFixture<ProductoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', {
      id: 1,
      name: 'Producto de prueba',
      price: 100,
      imageUrl: 'assets/images/test.jpg',
      category: 'Test',
      description: 'Producto para pruebas',
      inStock: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
