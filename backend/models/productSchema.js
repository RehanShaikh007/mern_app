import mongoose from "mongoose";

// variant Schema
const variantSchema = new mongoose.Schema({
    color:{
        type: String,
        required: true,
    },
    pricePerMeters:{
        type: Number,
        required: true,
    },
    stockInMeters:{
        type: Number,
        required: true,
    },
},{_id: false});

// Product Schema
const productSchema = new mongoose.Schema({
    // Basic Information
    productName:{
        type: String,
        required: true,
    },
    sku:{
        type: String,
        unique: true,
    },
    description:{
        type: String,
    },
    category:{
        type: String,
        enum:['Cotton Fabrics', 'Silk Fabrics', 'Polyester Fabrics', 'Blended Fabrics', 'Designer Prints', 'Solid Colors', 'Textured Fabrics', 'Seasonal Collection'],
        required: true,
    },
    unit:{
        type: String,
        enum:['METERS', 'SETS'],
        required: true,
    },
    // Product Variant
    variants:[variantSchema],
    // Product Images
    images:{
        type: [String],
        validate:[imageLimit, '{PATH} exceeds the limit of 5']
    },
    // Tags
    tags:{
        type: [String],
    },
    // Stock Information
    stockInfo:{
        minimumStock:{
            type: Number,
            required: true,
        },
        reorderPoint:{
            type: Number,
            required: true,
        },
        storageLocation:{
            type: String,
            required: true,
        },
    }
},{timestamps: true});

// Limit handler of Images
function imageLimit(val){
    return val.length <= 5;
}

// SKU auto-generator
productSchema.pre('save', function(next){
    if(!this.sku){
        this.sku = `SKU-${this._id.toString().slice(-6).toUpperCase()}`;
    }
    next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;