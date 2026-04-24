import {createPaypalOrder, capturePaypalOrder} from '../servicios/paypal.service.js';

export async function CreateOrder(req, res) {
    try {
        const {items, total} = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({error: 'El carrito esta vacio'});
        }
        if (!total || typeof total !== 'number' || total <= 0) {
            return res.status(400).json({error: 'Total invalido'});
        }   
        const order = await createPaypalOrder(items, total);
        return res.status(200).json({
            id: order.id,
            status: order.status,
        });
    } catch (error) {
        console.error('Error creando orden de PayPal:', error);
        return res.status(500).json({
            error: 'Error creando orden de PayPal',
            details: error.message,
        });
    }
}

export async function captureOrder(req, res) {
    try {
        const {orderId} = req.body;

        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json({error: 'orderId es requerido'});
        }
        const captureResult = await capturePaypalOrder(orderId);
        return res.status(200).json(captureResult);
    } catch (error) {
        console.error('Error capturando orden de PayPal:', error);
        return res.status(500).json({
            error: 'Error capturando orden de PayPal',
            details: error.message,
        });
    }
}
