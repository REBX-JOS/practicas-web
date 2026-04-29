import { Routes } from '@angular/router';
import { Catalogo } from '../components/catalogo/catalogo';
import { CheckoutComponent } from '../components/checkout/checkout';

export const routes: Routes = [
    { path: '', component: Catalogo },
    { path: 'checkout', component: CheckoutComponent },
    { path: '**', redirectTo: ''},
];
