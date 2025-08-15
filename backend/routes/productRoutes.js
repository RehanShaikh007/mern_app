import express from 'express';
import { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, getTopProducts, getRecentOrdersByProduct, getAllProductNames, fixOrdersForRenamedProducts, fixProductStockInconsistencies, syncAllStocksWithProducts } from "../controller/productController.js";
import { uploadImages } from '../controller/imageController.js';
import { upload } from '../middleware/uploadMiddleware.js';


const router = express.Router();
// Product Routes
router.post('/addProduct', createProduct);
router.get('/', getAllProducts);
router.get('/all/names', getAllProductNames);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

router.post('/upload-images', upload.array('images', 5), uploadImages);
router.get('/top/Products', getTopProducts);
router.get('/recent/orders/:productId', getRecentOrdersByProduct);
router.post('/fix-renamed-products', fixOrdersForRenamedProducts);
router.post('/fix-stock-inconsistencies', fixProductStockInconsistencies);
router.post('/sync-stocks-with-products', syncAllStocksWithProducts);

// // Stock Routes
// router.post('/stock/addStock', createStock);
// router.get('/stock', getAllStocks);
// router.get('/stock/:id', getStockById);
// router.put('/stock/:id', updateStock);
// router.delete('/stock/:id', deleteStock);

// // Order Routes
// router.post('/order/addOrder', createOrder);
// router.get('/order', getAllOrders);
// router.get('/order/:id', getOrderById);
// router.put('/order/:id', updateOrder);
// router.delete('/order/:id', deleteOrder);

// // Customer Routes
// router.post('/customer/addCustomer', createCustomer);
// router.get('/customer', getAllCustomers);
// router.get('/customer/:id', getCustomerById);
// router.put('/customer/:id', updateCustomer);
// router.delete('/customer/:id', deleteCustomer);

// // Return Routes
// router.post('/return/addReturn', createReturn);
// router.get('/return', getAllReturns);
// router.get('/return/:id', getReturnById);
// router.put('/return/:id', updateReturn);
// router.delete('/return/:id', deleteReturn);

export default router;