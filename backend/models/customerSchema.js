import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    customerName:{
        type: String,
        required: true,
    },
    customerType:{
        type: String,
        enum: ["Wholesale", "Retail"],
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    phone:{
        type: Number,
        required: true,
    },
    city:{
        type: String,
        enum: ["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune", "Kolkata", "Hyderabad", "Ahemdabad"],
        required: true,
    },
    creditLimit:{
        type: Number,
        required: true,
    },
    address:{
        type: String,
        required: true,
    }
},{timestamps: true});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;