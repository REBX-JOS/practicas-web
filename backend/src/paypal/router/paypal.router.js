import { controller} from '../controlador/paypal.controller.js';
import { Router } from 'express';
const router = Router();
export default router;
router.post('/create-order', controller.createOrder);
router.post('/capture-order', controller.captureOrder);
