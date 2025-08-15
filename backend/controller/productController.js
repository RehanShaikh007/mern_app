import Product from "../models/productSchema.js";
import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import Order from "../models/orderSchema.js";
import Stock from "../models/stockScehma.js"; // Added Stock import
import Adjustment from "../models/adjustmentSchema.js"; // Added Adjustment import

export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const newProduct = new Product(productData);
    await newProduct.save();

    console.log("New Product Created:", newProduct);

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let productUpdatesEnabled = false;
    if (notificationSettings) {
      productUpdatesEnabled = notificationSettings.productUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (productUpdatesEnabled) {
      const messageText = `🆕 New product added!\n\n📦 Product: *${newProduct.productName}*\n🆔 SKU: ${newProduct.sku}\n📂 Category: ${newProduct.category}\n\nView details: ${process.env.CLIENT_URL}/products/${newProduct._id}`;

      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (createProduct):", whatsAppError);
        status = "Not Delivered";
      }

      // Save message log
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount, // or dynamically get from your admin list
        status,
      });
    }

    res.status(201).json({
      success: true,
      message: "Product Created Successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error Creating Product:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || '-createdAt'; // Default sort by latest first
    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj = {};
    if (sort === '-createdAt') {
      sortObj = { createdAt: -1 };
    } else if (sort === 'createdAt') {
      sortObj = { createdAt: 1 };
    } else if (sort === '-updatedAt') {
      sortObj = { updatedAt: -1 };
    } else if (sort === 'updatedAt') {
      sortObj = { updatedAt: 1 };
    } else if (sort === 'productName') {
      sortObj = { productName: 1 };
    } else if (sort === '-productName') {
      sortObj = { productName: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find().sort(sortObj).skip(skip).limit(limit),
      Product.countDocuments()
    ]);

    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const updateProduct = async (req, res) => {
  try {
    // Get the original product to check what changed
    const originalProduct = await Product.findById(req.params.id);
    if (!originalProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    console.log(`🔄 Product "${updatedProduct.productName}" updated. Syncing changes to related stocks...`);

    // Find all stocks related to this product (by product name)
    const relatedStocks = await Stock.find({
      "stockDetails.product": originalProduct.productName
    });

    console.log(`📦 Found ${relatedStocks.length} related stocks to update`);

    // Update each related stock with the new product information
    for (const stock of relatedStocks) {
      const updateData = {};

      // Update product name if it changed
      if (originalProduct.productName !== updatedProduct.productName) {
        updateData["stockDetails.product"] = updatedProduct.productName;
        console.log(`  📝 Updating product name: "${originalProduct.productName}" → "${updatedProduct.productName}"`);
      }

      // Update variants if they changed
      if (JSON.stringify(originalProduct.variants) !== JSON.stringify(updatedProduct.variants)) {
        // Map product variants to stock variants format
        const updatedVariants = updatedProduct.variants.map(productVariant => ({
          color: productVariant.color,
          quantity: productVariant.stockInMeters || 0, // Keep existing stock quantity
          unit: updatedProduct.unit || "METERS"
        }));

        updateData.variants = updatedVariants;
        console.log(`  🎨 Updating variants: ${updatedVariants.length} variants`);
      }

      // Update unit if it changed
      if (originalProduct.unit !== updatedProduct.unit) {
        updateData.unit = updatedProduct.unit;
        console.log(`  📏 Updating unit: "${originalProduct.unit}" → "${updatedProduct.unit}"`);
      }

      // Update category if it changed (store in additional info or stock details)
      if (originalProduct.category !== updatedProduct.category) {
        updateData["stockDetails.category"] = updatedProduct.category;
        console.log(`  📂 Updating category: "${originalProduct.category}" → "${updatedProduct.category}"`);
      }

      // Update description if it changed
      if (originalProduct.description !== updatedProduct.description) {
        updateData["stockDetails.description"] = updatedProduct.description;
        console.log(`  📄 Updating description`);
      }

      // Update tags if they changed
      if (JSON.stringify(originalProduct.tags) !== JSON.stringify(updatedProduct.tags)) {
        updateData["stockDetails.tags"] = updatedProduct.tags;
        console.log(`  🏷️ Updating tags: ${updatedProduct.tags?.length || 0} tags`);
      }

      // Update SKU if it changed
      if (originalProduct.sku !== updatedProduct.sku) {
        updateData["stockDetails.sku"] = updatedProduct.sku;
        console.log(`  🆔 Updating SKU: "${originalProduct.sku}" → "${updatedProduct.sku}"`);
      }

      // Update stock info if it changed
      if (JSON.stringify(originalProduct.stockInfo) !== JSON.stringify(updatedProduct.stockInfo)) {
        updateData["stockDetails.stockInfo"] = updatedProduct.stockInfo;
        console.log(`  📊 Updating stock info`);
      }

      // Update images if they changed
      if (JSON.stringify(originalProduct.images) !== JSON.stringify(updatedProduct.images)) {
        updateData["stockDetails.images"] = updatedProduct.images;
        console.log(`  🖼️ Updating images: ${updatedProduct.images?.length || 0} images`);
      }

      // Apply updates if there are any changes
      if (Object.keys(updateData).length > 0) {
        await Stock.updateOne(
          { _id: stock._id },
          { $set: updateData }
        );
        console.log(`  ✅ Updated stock ${stock._id} (${stock.stockType})`);
      } else {
        console.log(`  ⏭️ No changes needed for stock ${stock._id}`);
      }
    }

    // Also update orders if product name changed
    if (originalProduct.productName !== updatedProduct.productName) {
      const orderUpdateResult = await Order.updateMany(
        { "orderItems.product": originalProduct.productName },
        { $set: { "orderItems.$[elem].product": updatedProduct.productName } },
        {
          arrayFilters: [{ "elem.product": originalProduct.productName }],
          multi: true
        }
      );
      console.log(`📋 Updated ${orderUpdateResult.modifiedCount} orders with new product name`);

      // Update adjustments
      const adjustmentUpdateResult = await Adjustment.updateMany(
        { "product": originalProduct.productName },
        { $set: { "product": updatedProduct.productName } }
      );
      console.log(`📝 Updated ${adjustmentUpdateResult.modifiedCount} adjustments with new product name`);
    }

    console.log(`🎯 Product update completed. ${relatedStocks.length} stocks synchronized.`);

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let productUpdatesEnabled = false;
    if (notificationSettings) {
      productUpdatesEnabled = notificationSettings.productUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (productUpdatesEnabled) {
      const messageText = `✏️ Product Updated!\n\n📦 Product: *${updatedProduct.productName}*\n🆔 SKU: ${updatedProduct.sku}\n📂 Category: ${updatedProduct.category}\n\nCheck the changes here: ${process.env.CLIENT_URL}/products/${updatedProduct._id}`;

      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (updateProduct):", whatsAppError);
        status = "Not Delivered";
      }

      // Save message log
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: `Product updated successfully. ${relatedStocks.length} related stocks synchronized.`,
      product: updatedProduct,
      stocksUpdated: relatedStocks.length
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let productUpdatesEnabled = false;
    if (notificationSettings) {
      productUpdatesEnabled = notificationSettings.productUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (productUpdatesEnabled) {
      const messageText = `🗑️ Product Deleted!\n\n📦 Product: *${deletedProduct.productName}*\n🆔 SKU: ${deletedProduct.sku}\n📂 Category: ${deletedProduct.category}`;

      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (deleteProduct):", whatsAppError);
        status = "Not Delivered";
      }

      // Save message log
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Get top 5 products based on revenue and quantity sold
export const getTopProducts = async (req, res) => {
  try {
    const pipeline = [
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product", // product name string
          quantity: { $sum: "$orderItems.quantity" },
          revenue: {
            $sum: {
              $multiply: [
                "$orderItems.quantity",
                "$orderItems.pricePerMeters"
              ]
            }
          }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "productName",
          as: "productInfo"
        }
      },
      {
        $project: {
          name: "$_id",
          revenue: 1,
          quantity: 1
          // No growth field here
        }
      }
    ];

    const data = await Order.aggregate(pipeline);

    const topProducts = data.map((product) => ({
      name: product.name,
      revenue: product.revenue,
      quantity: product.quantity
      // growth removed
    }));

    res.status(200).json(topProducts);
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// GET recent orders for a particular product
export const getRecentOrdersByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    console.log("🔍 Fetching recent orders for productId:", productId);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Find the product name from Product collection
    const product = await Product.findById(productId).select("productName");
    if (!product) {
      console.log("❌ Product not found for ID:", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log("📦 Found product:", product.productName);

    // Debug: Get all unique product names from orders
    const allOrders = await Order.find().lean();
    const allProductNames = new Set();
    allOrders.forEach(order => {
      order.orderItems.forEach(item => {
        allProductNames.add(item.product);
      });
    });
    console.log("🔍 All product names in orders:", Array.from(allProductNames));

    // Check for exact match first
    const exactMatchOrders = await Order.find({
      "orderItems.product": product.productName
    }).lean();
    console.log("🔍 Exact match orders count:", exactMatchOrders.length);

    // Check for partial matches (in case product was renamed)
    const partialMatchOrders = await Order.find({
      "orderItems.product": { $regex: new RegExp(product.productName.split(' ')[0], 'i') }
    }).lean();
    console.log("🔍 Partial match orders count:", partialMatchOrders.length);

    // Use exact matches if available, otherwise use partial matches
    let orders = exactMatchOrders;
    if (orders.length === 0 && partialMatchOrders.length > 0) {
      console.log("⚠️ No exact matches found, using partial matches");
      orders = partialMatchOrders;
    }

    // Sort by order date and limit
    orders = orders
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, limit);

    console.log("📋 Final orders count:", orders.length);
    console.log("📋 Orders:", orders.map(o => ({ id: o._id, customer: o.customer, items: o.orderItems.map(i => i.product) })));

    return res.status(200).json({
      success: true,
      product: product.productName,
      recentOrders: orders.map(order => {
        // Format order ID as ORD-XXX where XXX is a number
        const orderId = order._id.toString();
        // Extract only numeric digits from the ID
        const numericChars = orderId.replace(/[^0-9]/g, '');
        // Use the last 3 digits, or pad with zeros if less than 3 digits
        const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
        const formattedOrderId = `ORD-${lastThreeDigits}`;

        return {
          orderId: formattedOrderId,
          originalId: order._id, // Keep original ID for reference
          customer: order.customer,
          status: order.status,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          items: order.orderItems.filter(item =>
            item.product === product.productName ||
            item.product.toLowerCase().includes(product.productName.toLowerCase().split(' ')[0])
          )
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching recent orders by product:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Controller to get all product names
export const getAllProductNames = async (req, res) => {
  try {
    const products = await Product.find({}, 'productName'); // Only fetch the productName field
    const productNames = products.map(product => product.productName);
    res.status(200).json({ productNames });
  } catch (error) {
    console.error('Error fetching product names:', error);
    res.status(500).json({ message: 'Server Error: Unable to fetch product names.' });
  }
};

// Utility function to fix orders for renamed products (run this once to fix existing data)
export const fixOrdersForRenamedProducts = async (req, res) => {
  try {
    console.log("🔧 Starting to fix orders for renamed products...");

    // Get all products
    const products = await Product.find({}, 'productName');

    // Get all orders
    const orders = await Order.find().lean();

    let totalUpdated = 0;

    // For each order, check if any product names need updating
    for (const order of orders) {
      for (const item of order.orderItems) {
        // Check if this product name exists in products collection
        const productExists = products.some(p => p.productName === item.product);

        if (!productExists) {
          console.log(`⚠️ Order ${order._id} has product "${item.product}" that doesn't exist in products collection`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Checked ${orders.length} orders. Found ${totalUpdated} items that need attention.`,
      totalOrders: orders.length,
      totalUpdated
    });

  } catch (error) {
    console.error('Error fixing orders for renamed products:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fix orders for renamed products.',
      error: error.message
    });
  }
};

// Utility function to fix data inconsistencies between products and stocks
export const fixProductStockInconsistencies = async (req, res) => {
  try {
    console.log("🔧 Starting to fix product-stock inconsistencies...");

    // Get all products
    const products = await Product.find({}, 'productName _id');
    const productNames = products.map(p => p.productName);

    // Get all stocks
    const stocks = await Stock.find().lean();

    let totalFixed = 0;
    let inconsistencies = [];

    // Check each stock for inconsistencies
    for (const stock of stocks) {
      const stockProductName = stock.stockDetails?.product;

      if (stockProductName && !productNames.includes(stockProductName)) {
        inconsistencies.push({
          stockId: stock._id,
          stockType: stock.stockType,
          productName: stockProductName,
          issue: "Product name not found in products collection"
        });

        // Try to find a similar product name (basic matching)
        const similarProduct = products.find(p =>
          p.productName.toLowerCase().includes(stockProductName.toLowerCase().split(' ')[0]) ||
          stockProductName.toLowerCase().includes(p.productName.toLowerCase().split(' ')[0])
        );

        if (similarProduct) {
          console.log(`🔄 Fixing stock ${stock._id}: "${stockProductName}" → "${similarProduct.productName}"`);

          // Update the stock
          await Stock.updateOne(
            { _id: stock._id },
            { $set: { "stockDetails.product": similarProduct.productName } }
          );

          totalFixed++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Fixed ${totalFixed} inconsistencies out of ${inconsistencies.length} found.`,
      totalStocks: stocks.length,
      totalFixed,
      inconsistencies: inconsistencies.slice(0, 10) // Show first 10 for reference
    });

  } catch (error) {
    console.error('Error fixing product-stock inconsistencies:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fix product-stock inconsistencies.',
      error: error.message
    });
  }
};

// Utility function to sync all stocks with their current product data
export const syncAllStocksWithProducts = async (req, res) => {
  try {
    console.log("🔄 Starting to sync all stocks with their current product data...");

    // Get all products
    const products = await Product.find();
    const productsByName = {};
    products.forEach(p => {
      productsByName[p.productName] = p;
    });

    // Get all stocks
    const stocks = await Stock.find();

    let totalSynced = 0;
    let totalSkipped = 0;
    let errors = [];

    for (const stock of stocks) {
      try {
        const stockProductName = stock.stockDetails?.product;

        if (!stockProductName) {
          console.log(`⚠️ Stock ${stock._id} has no product name, skipping...`);
          totalSkipped++;
          continue;
        }

        const product = productsByName[stockProductName];

        if (!product) {
          console.log(`⚠️ Product "${stockProductName}" not found for stock ${stock._id}, skipping...`);
          totalSkipped++;
          continue;
        }

        // Prepare update data
        const updateData = {
          "stockDetails.product": product.productName,
          "stockDetails.category": product.category,
          "stockDetails.description": product.description,
          "stockDetails.tags": product.tags,
          "stockDetails.sku": product.sku,
          "stockDetails.stockInfo": product.stockInfo,
          "stockDetails.images": product.images,
          "unit": product.unit
        };

        // Update variants to match product variants (but keep existing quantities)
        const updatedVariants = product.variants.map(productVariant => {
          // Find existing stock variant with same color
          const existingVariant = stock.variants.find(sv => sv.color === productVariant.color);
          return {
            color: productVariant.color,
            quantity: existingVariant ? existingVariant.quantity : 0, // Keep existing quantity
            unit: product.unit || "METERS"
          };
        });

        updateData.variants = updatedVariants;

        // Apply updates
        await Stock.updateOne(
          { _id: stock._id },
          { $set: updateData }
        );

        console.log(`✅ Synced stock ${stock._id} (${stock.stockType}) with product "${product.productName}"`);
        totalSynced++;

      } catch (error) {
        console.error(`❌ Error syncing stock ${stock._id}:`, error);
        errors.push({
          stockId: stock._id,
          error: error.message
        });

      }}

    

    res.status(200).json({
      success: true,
      message: `Sync completed. ${totalSynced} stocks synced, ${totalSkipped} skipped.`,
      totalStocks: stocks.length,
      totalSynced,
      totalSkipped,
      errors: errors.slice(0, 10) // Show first 10 errors
    });

  } catch (error) {
    console.error('Error syncing stocks with products:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to sync stocks with products.',
      error: error.message
    });
  }
}

