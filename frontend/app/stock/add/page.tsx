"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  ArrowLeft,
  Save,
  Factory,
  Palette,
  Plus,
  Loader2,
  Search,
  Check,
  ChevronDown,
} from "lucide-react";
import Link from "next/link"
import { useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api";

// Agent interface based on API response
interface Agent {
  _id: string;
  name: string;
  factory: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

// Product interfaces for color variants
interface ProductVariant { color: string; pricePerMeters?: number; stockInMeters?: number }
interface Product { _id: string; productName: string; variants: ProductVariant[] }

export default function AddStockPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stockType, setStockType] = useState("gray");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [variants, setVariants] = useState([
    { color: "", quantity: "", unit: "meters" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Add state for products fetching
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  
  // Full products list with variants for color options
  const [productsWithVariants, setProductsWithVariants] = useState<Product[]>([]);
  
  // Gray Stock products for Factory Stock selection
  const [grayStockProducts, setGrayStockProducts] = useState<Product[]>([]);
  const [grayStockProductsLoading, setGrayStockProductsLoading] = useState(true);
  
  // Factory Stock products for Design Stock selection
  const [factoryStockProducts, setFactoryStockProducts] = useState<Product[]>([]);
  const [factoryStockProductsLoading, setFactoryStockProductsLoading] = useState(true);
  const [factoryStockProductsError, setFactoryStockProductsError] = useState<string | null>(null);
  
  // Searchable product selector state
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const productSearchRef = useRef<HTMLDivElement>(null);
  
  // Searchable design selector state
  const [designSearchTerm, setDesignSearchTerm] = useState("");
  const [showDesignSuggestions, setShowDesignSuggestions] = useState(false);
  const [filteredDesigns, setFilteredDesigns] = useState<typeof designs>([]);
  const designSearchRef = useRef<HTMLDivElement>(null);
  
  // Searchable warehouse selector state
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState("");
  const [showWarehouseSuggestions, setShowWarehouseSuggestions] = useState(false);
  const [filteredWarehouses, setFilteredWarehouses] = useState<typeof warehouses>([]);
  const warehouseSearchRef = useRef<HTMLDivElement>(null);
  
  // Add state for agents fetching
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [factories, setFactories] = useState<string[]>([]);

  // Add state for required fields
  const [stockDetails, setStockDetails] = useState({
    factory: "",
    agent: "",
    orderNumber: "",
    processingStage: "",
    expectedCompletion: "",
    design: "",
    warehouse: "",
  });

  const [addtionalInfo, setAddtionalInfo] = useState({
    batchNumber: "",
    qualityGrade: "",
    notes: "",
  });

  // Search functionality for products
  useEffect(() => {
    // Use Gray Stock products for Factory Stock, Factory Stock products for Design Stock, all products for Gray Stock
    let availableProducts;
    if (stockType === "factory") {
      availableProducts = grayStockProducts;
    } else if (stockType === "design") {
      availableProducts = factoryStockProducts;
    } else {
      availableProducts = productsWithVariants;
    }
    
    console.log("Product search - Stock type:", stockType); // Debug log
    console.log("Product search - Available products count:", availableProducts.length); // Debug log
    console.log("Product search - Gray Stock products count:", grayStockProducts.length); // Debug log
    console.log("Product search - Factory Stock products count:", factoryStockProducts.length); // Debug log
    console.log("Product search - All products count:", productsWithVariants.length); // Debug log
    
    if (productSearchTerm.trim() === "") {
      setFilteredProducts(availableProducts);
    } else {
      const filtered = availableProducts.filter(product =>
        product.productName.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchTerm, productsWithVariants, grayStockProducts, factoryStockProducts, stockType]);

  // Search functionality for designs
  useEffect(() => {
    if (designSearchTerm.trim() === "") {
      setFilteredDesigns(designs);
    } else {
      const filtered = designs.filter(design =>
        design.name.toLowerCase().includes(designSearchTerm.toLowerCase())
      );
      setFilteredDesigns(filtered);
    }
  }, [designSearchTerm]);

  // Search functionality for warehouses
  useEffect(() => {
    if (warehouseSearchTerm.trim() === "") {
      setFilteredWarehouses(warehouses);
    } else {
      const filtered = warehouses.filter(warehouse =>
        warehouse.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) ||
        warehouse.location.toLowerCase().includes(warehouseSearchTerm.toLowerCase())
      );
      setFilteredWarehouses(filtered);
    }
  }, [warehouseSearchTerm]);

  // Refetch Gray Stock products when switching to Factory Stock
  useEffect(() => {
    console.log("Stock type changed to:", stockType); // Debug log
    console.log("Products with variants length:", productsWithVariants.length); // Debug log
    
    if (stockType === "factory") {
      console.log("Switching to Factory Stock, fetching Gray Stock products..."); // Debug log
      const fetchGrayStockProducts = async () => {
        try {
          setGrayStockProductsLoading(true);
          
          // Wait for productsWithVariants to be loaded
          if (productsWithVariants.length === 0) {
            return;
          }
          
          const response = await fetch(`${API_BASE_URL}/stock?stockType=Gray Stock&limit=1000`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Gray Stock API Response:", data); // Debug log
            
            if (data?.success && Array.isArray(data.stocks)) {
              console.log("All Gray Stock entries:", data.stocks); // Debug log
              
              // Extract unique products from Gray Stock
              const grayStockProductNames = [...new Set(data.stocks.map((stock: any) => stock.stockDetails?.product))].filter(Boolean);
              console.log("Extracted Gray Stock product names:", grayStockProductNames); // Debug log
              console.log("Available products with variants:", productsWithVariants); // Debug log
              
              // Get full product details for these products
              const grayStockProductsData = productsWithVariants.filter(product => 
                grayStockProductNames.includes(product.productName)
              );
              console.log("Final filtered Gray Stock products:", grayStockProductsData); // Debug log
              
              setGrayStockProducts(grayStockProductsData);
            }
          }
        } catch (err) {
          console.error("Error fetching Gray Stock products:", err);
        } finally {
          setGrayStockProductsLoading(false);
        }
      };
      
      fetchGrayStockProducts();
    } else if (stockType === "design") {
      console.log("Switching to Design Stock, fetching Factory Stock products..."); // Debug log
      const fetchFactoryStockProducts = async () => {
        try {
          setFactoryStockProductsLoading(true);
          setFactoryStockProductsError(null);
          
          // Wait for productsWithVariants to be loaded
          if (productsWithVariants.length === 0) {
            return;
          }
          
          const response = await fetch(`${API_BASE_URL}/stock?stockType=Factory Stock&limit=1000`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Factory Stock API Response:", data); // Debug log
            
            if (data?.success && Array.isArray(data.stocks)) {
              console.log("All Factory Stock entries:", data.stocks); // Debug log
              
              // Extract unique products from Factory Stock
              const factoryStockProductNames = [...new Set(data.stocks.map((stock: any) => stock.stockDetails?.product))].filter(Boolean);
              console.log("Extracted Factory Stock product names:", factoryStockProductNames); // Debug log
              console.log("Available products with variants:", productsWithVariants); // Debug log
              
              // Get full product details for these products
              const factoryStockProductsData = productsWithVariants.filter(product => 
                factoryStockProductNames.includes(product.productName)
              );
              console.log("Final filtered Factory Stock products:", factoryStockProductsData); // Debug log
              
              setFactoryStockProducts(factoryStockProductsData);
            }
          } else {
            throw new Error(`Failed to fetch Factory Stock: ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          console.error("Error fetching Factory Stock products:", err);
          setFactoryStockProductsError(err instanceof Error ? err.message : "Failed to fetch Factory Stock products");
        } finally {
          setFactoryStockProductsLoading(false);
        }
      };
      
      fetchFactoryStockProducts();
    }
    
    // Clear selected product when switching stock types
    setSelectedProduct("");
    setProductSearchTerm("");
  }, [stockType, productsWithVariants]);

  // Refetch Gray Stock products when productsWithVariants is loaded
  useEffect(() => {
    if (stockType === "factory" && productsWithVariants.length > 0 && grayStockProducts.length === 0) {
      const fetchGrayStockProducts = async () => {
        try {
          setGrayStockProductsLoading(true);
          const response = await fetch(`${API_BASE_URL}/stock?stockType=Gray Stock&limit=1000`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Refetch - Gray Stock API Response:", data); // Debug log
            
            if (data?.success && Array.isArray(data.stocks)) {
              console.log("Refetch - All Gray Stock entries:", data.stocks); // Debug log
              
              const grayStockProductNames = [...new Set(data.stocks.map((stock: any) => stock.stockDetails?.product))].filter(Boolean);
              console.log("Refetch - Extracted product names:", grayStockProductNames); // Debug log
              console.log("Refetch - Available products with variants:", productsWithVariants); // Debug log
              
              const grayStockProductsData = productsWithVariants.filter(product => 
                grayStockProductNames.includes(product.productName)
              );
              console.log("Refetch - Final filtered products:", grayStockProductsData); // Debug log
              
              setGrayStockProducts(grayStockProductsData);
            }
          }
        } catch (err) {
          console.error("Error refetching Gray Stock products:", err);
        } finally {
          setGrayStockProductsLoading(false);
        }
      };
      
      fetchGrayStockProducts();
    }
  }, [productsWithVariants, stockType, grayStockProducts.length]);

  // Refetch Factory Stock products when productsWithVariants is loaded
  useEffect(() => {
    if (stockType === "design" && productsWithVariants.length > 0 && factoryStockProducts.length === 0) {
      const fetchFactoryStockProducts = async () => {
        try {
          setFactoryStockProductsLoading(true);
          setFactoryStockProductsError(null);
          const response = await fetch(`${API_BASE_URL}/stock?stockType=Factory Stock&limit=1000`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Refetch - Factory Stock API Response:", data); // Debug log
            
            if (data?.success && Array.isArray(data.stocks)) {
              console.log("Refetch - All Factory Stock entries:", data.stocks); // Debug log
              
              const factoryStockProductNames = [...new Set(data.stocks.map((stock: any) => stock.stockDetails?.product))].filter(Boolean);
              console.log("Refetch - Extracted product names:", factoryStockProductNames); // Debug log
              console.log("Refetch - Available products with variants:", productsWithVariants); // Debug log
              
              const factoryStockProductsData = productsWithVariants.filter(product => 
                factoryStockProductNames.includes(product.productName)
              );
              console.log("Refetch - Final filtered products:", factoryStockProductsData); // Debug log
              
              setFactoryStockProducts(factoryStockProductsData);
            } else {
              throw new Error(`Failed to fetch Factory Stock: ${response.status} ${response.statusText}`);
            }
          } else {
            throw new Error(`Failed to fetch Factory Stock: ${response.status} ${response.statusText}`);
          }
        } catch (err) {
          console.error("Error refetching Factory Stock products:", err);
          setFactoryStockProductsError(err instanceof Error ? err.message : "Failed to fetch Factory Stock products");
        } finally {
          setFactoryStockProductsLoading(false);
        }
      };
      
      fetchFactoryStockProducts();
    }
  }, [productsWithVariants, stockType, factoryStockProducts.length]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
      if (designSearchRef.current && !designSearchRef.current.contains(event.target as Node)) {
        setShowDesignSuggestions(false);
      }
      if (warehouseSearchRef.current && !warehouseSearchRef.current.contains(event.target as Node)) {
        setShowWarehouseSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product.productName);
    setProductSearchTerm(product.productName);
    setShowProductSuggestions(false);
  };

  const handleDesignSelect = (design: typeof designs[0]) => {
    setStockDetails({ ...stockDetails, design: design.id });
    setDesignSearchTerm(design.name);
    setShowDesignSuggestions(false);
  };

  const handleWarehouseSelect = (warehouse: typeof warehouses[0]) => {
    setStockDetails({ ...stockDetails, warehouse: warehouse.id });
    setWarehouseSearchTerm(`${warehouse.name} - ${warehouse.location}`);
    setShowWarehouseSuggestions(false);
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setShowProductSuggestions(true);
    if (value === "") {
      setSelectedProduct("");
    }
  };

  const handleDesignSearchChange = (value: string) => {
    setDesignSearchTerm(value);
    setShowDesignSuggestions(true);
    
    // Allow manual entry - if user types something, set it as the design
    if (value.trim() !== "") {
      // Check if it matches an existing design
      const existingDesign = designs.find(d => d.name.toLowerCase() === value.toLowerCase());
      if (existingDesign) {
        setStockDetails({ ...stockDetails, design: existingDesign.id });
      } else {
        // Allow manual entry - create a custom design ID
        setStockDetails({ ...stockDetails, design: `CUSTOM-${Date.now()}` });
      }
    } else {
      setStockDetails({ ...stockDetails, design: "" });
    }
  };

  const handleWarehouseSearchChange = (value: string) => {
    setWarehouseSearchTerm(value);
    setShowWarehouseSuggestions(true);
    
    // Allow manual entry - if user types something, set it as the warehouse
    if (value.trim() !== "") {
      // Check if it matches an existing warehouse
      const existingWarehouse = warehouses.find(w => 
        `${w.name} - ${w.location}`.toLowerCase() === value.toLowerCase()
      );
      if (existingWarehouse) {
        setStockDetails({ ...stockDetails, warehouse: existingWarehouse.id });
      } else {
        // Allow manual entry - create a custom warehouse ID
        setStockDetails({ ...stockDetails, warehouse: `CUSTOM-${Date.now()}` });
      }
    } else {
      setStockDetails({ ...stockDetails, warehouse: "" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowProductSuggestions(false);
      setShowDesignSuggestions(false);
      setShowWarehouseSuggestions(false);
    }
  };

  // Fetch products and agents from backend on component mount
  useEffect(() => {
    const fetchProductNames = async () => {
      try {
        setProductsLoading(true);
        setProductsError(null);

        const response = await fetch(`${API_BASE_URL}/products/all/names`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch product names: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        setProductNames((data.productNames as string[]) || []);
      } catch (err) {
        console.error("Error fetching product names:", err);
        setProductsError(
          err instanceof Error ? err.message : "Failed to fetch product names"
        );
      } finally {
        setProductsLoading(false);
      }
    };

    const fetchAgentsAndFactories = async () => {
      try {
        setAgentsLoading(true);
        const response = await fetch(`${API_BASE_URL}/agent/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch agents: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        
        if (data.success) {
          setAgents(data.agents || []);
          // Extract unique factory names from agents
          const uniqueFactories = [...new Set(data.agents.map((agent: Agent) => agent.factory))] as string[];
          setFactories(uniqueFactories);
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
      } finally {
        setAgentsLoading(false);
      }
    };

    // Fetch full products with variants for color options
    const fetchProductsWithVariants = async () => {
      try {
        const res1 = await fetch(`${API_BASE_URL}/products`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res1.ok) {
          const data = await res1.json();
          if (data?.success && Array.isArray(data.products)) {
            setProductsWithVariants(data.products as Product[]);
            return;
          }
        }
        // Fallback
        const res2 = await fetch(`${API_BASE_URL}/products/products`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res2.ok) {
          const data = await res2.json();
          if (data?.success && Array.isArray(data.products)) {
            setProductsWithVariants(data.products as Product[]);
          }
        }
      } catch (err) {
        console.error("Error fetching products with variants:", err);
      }
    };

    fetchProductNames();
    fetchAgentsAndFactories();
    fetchProductsWithVariants();
  }, []);

  const designs = [
    { id: "DES-001", name: "Floral Print", category: "printed" },
    { id: "DES-002", name: "Abstract Pattern", category: "printed" },
    { id: "DES-003", name: "Geometric Design", category: "printed" },
    { id: "DES-004", name: "Solid Colors", category: "solid" },
  ];

  const warehouses = [
    { id: "WH-001", name: "Main Warehouse", location: "Mumbai" },
    { id: "WH-002", name: "Secondary Warehouse", location: "Delhi" },
    { id: "WH-003", name: "Regional Warehouse", location: "Bangalore" },
  ];

  const addVariant = () => {
    setVariants([...variants, { color: "", quantity: "", unit: "meters" }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const updated = variants.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    );
    setVariants(updated);
  };

  const getTotalQuantity = () => {
    return variants.reduce((sum, variant) => {
      const qty = Number.parseFloat(variant.quantity) || 0;
      // Convert sets to meters if needed
      if (variant.unit === "sets") {
        return sum + qty * 60; // 1 set = 60 meters
      }
      return sum + qty;
    }, 0);
  };

  // Colors for the currently selected product (variant colors from product creation)
  const getAvailableColorsForSelectedProduct = (): string[] => {
    if (!selectedProduct) return [];
    const product = productsWithVariants.find(p => p.productName === selectedProduct);
    return product ? product.variants.map(v => v.color) : [];
  };

  // Colors already chosen across variants (excluding empties)
  const getSelectedColors = (): string[] => {
    return variants.map(v => v.color).filter((c) => !!c);
  };

  // Remaining colors for a specific variant index, keeping its current selection visible
  const getAvailableColorsForVariant = (index: number): string[] => {
    const allColors = getAvailableColorsForSelectedProduct();
    if (allColors.length === 0) return [];
    const currentColor = variants[index]?.color;
    const selectedByOthers = variants
      .filter((_, i) => i !== index)
      .map(v => v.color)
      .filter((c) => !!c);
    return allColors.filter((color) => color === currentColor || !selectedByOthers.includes(color));
  };

  // Helper function to retry fetching product names
  const retryFetchProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);

      const response = await fetch(`${API_BASE_URL}/products/all/names`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch product names: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setProductNames(data.productNames || []);
    } catch (err) {
      console.error("Error fetching product names:", err);
      setProductsError(
        err instanceof Error ? err.message : "Failed to fetch product names"
      );
    } finally {
      setProductsLoading(false);
    }
  };

  // Helper function to retry fetching Factory Stock products
  const retryFetchFactoryStockProducts = async () => {
    try {
      setFactoryStockProductsLoading(true);
      setFactoryStockProductsError(null);
      
      const response = await fetch(`${API_BASE_URL}/stock?stockType=Factory Stock&limit=1000`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data?.success && Array.isArray(data.stocks)) {
          const factoryStockProductNames = [...new Set(data.stocks.map((stock: any) => stock.stockDetails?.product))].filter(Boolean);
          const factoryStockProductsData = productsWithVariants.filter(product => 
            factoryStockProductNames.includes(product.productName)
          );
          setFactoryStockProducts(factoryStockProductsData);
        } else {
          throw new Error(`Failed to fetch Factory Stock: ${response.status} ${response.statusText}`);
        }
      } else {
        throw new Error(`Failed to fetch Factory Stock: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error refetching Factory Stock products:", err);
      setFactoryStockProductsError(err instanceof Error ? err.message : "Failed to fetch Factory Stock products");
    } finally {
      setFactoryStockProductsLoading(false);
    }
  };

  // Add this handler for form submission
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validate that a product is selected
    if (!selectedProduct) {
      toast({ title: "Product required", description: "Please select a product", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // Map variants to backend schema
      const backendVariants = variants.map((v) => ({
        color: v.color,
        quantity:
          v.unit === "sets"
            ? (parseFloat(v.quantity) || 0) * 60
            : parseFloat(v.quantity) || 0,
        unit: v.unit.toUpperCase(),
      }));

      // Prepare stockDetails based on stockType
      let backendStockDetails: any = {};
      if (stockType === "gray") {
        backendStockDetails = {
          product: selectedProduct,
          factory: stockDetails.factory,
          agent: stockDetails.agent,
          orderNumber: stockDetails.orderNumber,
        };
      } else if (stockType === "factory") {
        backendStockDetails = {
          product: selectedProduct,
          processingFactory: stockDetails.factory,
          processingStage: stockDetails.processingStage,
          expectedCompletion: stockDetails.expectedCompletion,
        };
      } else if (stockType === "design") {
        // For design stock, store the actual names instead of just IDs
        let designName = stockDetails.design;
        let warehouseName = stockDetails.warehouse;
        
        // If it's a custom design (starts with CUSTOM-), use the search term
        if (stockDetails.design.startsWith('CUSTOM-')) {
          designName = designSearchTerm;
        } else {
          // Find the design name from the designs array
          const design = designs.find(d => d.id === stockDetails.design);
          designName = design ? design.name : stockDetails.design;
        }
        
        // If it's a custom warehouse (starts with CUSTOM-), use the search term
        if (stockDetails.warehouse.startsWith('CUSTOM-')) {
          warehouseName = warehouseSearchTerm;
        } else {
          // Find the warehouse name from the warehouses array
          const warehouse = warehouses.find(w => w.id === stockDetails.warehouse);
          warehouseName = warehouse ? `${warehouse.name} - ${warehouse.location}` : stockDetails.warehouse;
        }
        
        backendStockDetails = {
          product: selectedProduct,
          design: designName,
          warehouse: warehouseName,
        };
      }

      // Prepare addtionalInfo (single object, not array)
      const backendAddtionalInfo = {
        batchNumber: addtionalInfo.batchNumber,
        qualityGrade: addtionalInfo.qualityGrade,
        notes: addtionalInfo.notes,
      };

      // Determine initial status based on total quantity
      const totalQuantity = backendVariants.reduce(
        (sum, variant) => sum + variant.quantity,
        0
      );
      let initialStatus = "available";
      if (totalQuantity === 0) {
        initialStatus = "out";
      } else if (totalQuantity < 100) {
        initialStatus = "low";
      } else if (stockType === "factory") {
        initialStatus = "processing";
      }

      const payload = {
        stockType:
          stockType === "gray"
            ? "Gray Stock"
            : stockType === "factory"
            ? "Factory Stock"
            : "Design Stock",
        status: initialStatus,
        variants: backendVariants,
        stockDetails: backendStockDetails,
        addtionalInfo: backendAddtionalInfo,
      };

      console.log("Sending payload:", payload); // Debug log

      const response = await fetch(`${API_BASE_URL}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add stock");
      }

      const result = await response.json();
      console.log("Success:", result); // Debug log

      setSuccess(true);
      toast({ title: "Stock added", description: `${selectedProduct} ${stockType === "design" ? "(Design)" : stockType === "factory" ? "(Factory)" : "(Gray)"} added successfully.` });
      // Redirect to stock list after a short delay
      setTimeout(() => {
        router.push("/stock");
      }, 900);
    } catch (err) {
      console.error("Error:", err); // Debug log
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast({ title: "Failed to add stock", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Add Stock</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* --- Demo: Adjustment Improvements --- */}
        {/* <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded mb-4">
          <p className="text-orange-800 text-sm font-medium">
            
          </p>
        </div> */}
        {/* --- End Demo --- */}
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stock">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">Add Stock Entry</h2>
              <p className="text-muted-foreground">
                Add new stock to your inventory
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddStock}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Stock Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stock Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Type</CardTitle>
                  <CardDescription>
                    Select the type of stock you're adding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={stockType}
                    onValueChange={setStockType}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="gray">Gray Stock</TabsTrigger>
                      <TabsTrigger value="factory">Factory Stock</TabsTrigger>
                      <TabsTrigger value="design">Design Stock</TabsTrigger>
                    </TabsList>

                    <TabsContent value="gray" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="product">Product</Label>
                          <div className="relative" ref={productSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search products..."
                                value={productSearchTerm}
                                onChange={(e) => handleProductSearchChange(e.target.value)}
                                onFocus={() => setShowProductSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Product Suggestions Dropdown */}
                            {showProductSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {stockType === "factory" && grayStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading Gray Stock products...</span>
                                  </div>
                                ) : stockType === "design" && factoryStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading Factory Stock products...</span>
                                  </div>
                                ) : productsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : productsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {productsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : stockType === "design" && factoryStockProductsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {factoryStockProductsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchFactoryStockProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : filteredProducts.length === 0 ? (
                                  <div className="p-4 text-muted-foreground text-sm">
                                    {stockType === "factory" 
                                      ? "No products found in Gray Stock. Add products to Gray Stock first."
                                      : stockType === "design"
                                      ? "No products found in Factory Stock. Add products to Factory Stock first."
                                      : productSearchTerm 
                                        ? "No products found" 
                                        : "No products available"
                                    }
                                  </div>
                                ) : (
                                  filteredProducts.map((product) => (
                                    <div
                                      key={product._id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                      onClick={() => handleProductSelect(product)}
                                    >
                                      <span>{product.productName}</span>
                                      {selectedProduct === product.productName && (
                                        <Check className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="factory">Factory</Label>
                          <Select
                            value={stockDetails.factory}
                            onValueChange={(value) =>
                              setStockDetails({
                                ...stockDetails,
                                factory: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select factory" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading factories...</span>
                                </div>
                              ) : (
                                factories.map((factory, index) => (
                                  <SelectItem key={index} value={factory}>
                                    {factory}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agent">Agent</Label>
                          <Select
                            value={stockDetails.agent}
                            onValueChange={(value) =>
                              setStockDetails({ ...stockDetails, agent: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading agents...</span>
                                </div>
                              ) : (
                                agents.map((agent) => (
                                  <SelectItem key={agent._id} value={agent.name}>
                                    {agent.name} - {agent.factory}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="order-number">Order Number</Label>
                          <Input
                            id="order-number"
                            placeholder="PO-2024-001"
                            value={stockDetails.orderNumber}
                            onChange={(e) =>
                              setStockDetails({
                                ...stockDetails,
                                orderNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="factory" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="product">Product</Label>
                          <div className="relative" ref={productSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder={stockType === "factory" ? "Search Gray Stock products..." : "Search products..."}
                                value={productSearchTerm}
                                onChange={(e) => handleProductSearchChange(e.target.value)}
                                onFocus={() => setShowProductSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Product Suggestions Dropdown */}
                            {showProductSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {stockType === "factory" && grayStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading Gray Stock products...</span>
                                  </div>
                                ) : stockType === "design" && factoryStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading Factory Stock products...</span>
                                  </div>
                                ) : productsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : productsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {productsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : stockType === "design" && factoryStockProductsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {factoryStockProductsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchFactoryStockProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : filteredProducts.length === 0 ? (
                                  <div className="p-4 text-muted-foreground text-sm">
                                    {stockType === "factory" 
                                      ? "No products found in Gray Stock. Add products to Gray Stock first."
                                      : stockType === "design"
                                      ? "No products found in Factory Stock. Add products to Factory Stock first."
                                      : productSearchTerm 
                                        ? "No products found" 
                                        : "No products available"
                                    }
                                  </div>
                                ) : (
                                  filteredProducts.map((product) => (
                                    <div
                                      key={product._id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                      onClick={() => handleProductSelect(product)}
                                    >
                                      <span>{product.productName}</span>
                                      {selectedProduct === product.productName && (
                                        <Check className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="factory">Processing Factory</Label>
                          <Select
                            value={stockDetails.factory}
                            onValueChange={(value) =>
                              setStockDetails({
                                ...stockDetails,
                                factory: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select factory" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading factories...</span>
                                </div>
                              ) : (
                                factories.map((factory, index) => (
                                  <SelectItem key={index} value={factory}>
                                    {factory}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stage">Processing Stage</Label>
                          <Select
                            value={stockDetails.processingStage}
                            onValueChange={(value) =>
                              setStockDetails({
                                ...stockDetails,
                                processingStage: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dyeing">Dyeing</SelectItem>
                              <SelectItem value="printing">Printing</SelectItem>
                              <SelectItem value="finishing">
                                Finishing
                              </SelectItem>
                              <SelectItem value="quality-check">
                                Quality Check
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expected-completion">
                            Expected Completion
                          </Label>
                          <Input
                            id="expected-completion"
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={stockDetails.expectedCompletion}
                            onChange={(e) => {
                              const selectedDate = new Date(e.target.value);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              
                              if (selectedDate < today) {
                                toast({
                                  title: "Invalid Date",
                                  description: "Expected completion date must be in the future.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              setStockDetails({
                                ...stockDetails,
                                expectedCompletion: e.target.value,
                              });
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="design" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="product">Product</Label>
                          <div className="relative" ref={productSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search products..."
                                value={productSearchTerm}
                                onChange={(e) => handleProductSearchChange(e.target.value)}
                                onFocus={() => setShowProductSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Product Suggestions Dropdown */}
                            {showProductSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {stockType === "design" && factoryStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading Factory Stock products...</span>
                                  </div>
                                ) : productsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : stockType === "design" && factoryStockProductsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {factoryStockProductsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchFactoryStockProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : productsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {productsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : filteredProducts.length === 0 ? (
                                  <div className="p-4 text-muted-foreground text-sm">
                                    {stockType === "design"
                                      ? "No products found in Factory Stock. Add products to Factory Stock first."
                                      : productSearchTerm ? "No products found" : "No products available"}
                                  </div>
                                ) : (
                                  filteredProducts.map((product) => (
                                    <div
                                      key={product._id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                      onClick={() => handleProductSelect(product)}
                                    >
                                      <span>{product.productName}</span>
                                      {selectedProduct === product.productName && (
                                        <Check className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="design">Design</Label>
                          <div className="relative" ref={designSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Type design name or search existing designs..."
                                value={designSearchTerm}
                                onChange={(e) => handleDesignSearchChange(e.target.value)}
                                onFocus={() => setShowDesignSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Design Suggestions Dropdown */}
                            {showDesignSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {filteredDesigns.length === 0 ? (
                                  <div className="p-4 text-muted-foreground text-sm">
                                    {designSearchTerm ? "No designs found" : "No designs available"}
                                  </div>
                                ) : (
                                  <>
                                    {/* Existing Designs */}
                                    {filteredDesigns.map((design) => (
                                      <div
                                        key={design.id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                        onClick={() => handleDesignSelect(design)}
                                      >
                                        <div>
                                          <span className="font-medium">{design.name}</span>
                                          <span className="text-xs text-muted-foreground ml-2">({design.category})</span>
                                        </div>
                                        {stockDetails.design === design.id && (
                                          <Check className="h-4 w-4 text-green-500" />
                                        )}
                                      </div>
                                    ))}
                                    
                                    {/* Add New Design Option */}
                                    {designSearchTerm && !filteredDesigns.find(d => d.name.toLowerCase() === designSearchTerm.toLowerCase()) && (
                                      <>
                                        <div className="border-t border-gray-200 my-1"></div>
                                        <div
                                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-blue-600"
                                          onClick={() => {
                                            // Add new design to the list
                                            const newDesign = {
                                              id: `DES-${Date.now()}`,
                                              name: designSearchTerm,
                                              category: "custom"
                                            };
                                            // Update the designs array (you might want to persist this)
                                            designs.push(newDesign);
                                            handleDesignSelect(newDesign);
                                          }}
                                        >
                                          <Plus className="h-4 w-4" />
                                          <span>Add "{designSearchTerm}" as new design</span>
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Show when custom design is entered */}
                          {designSearchTerm && !designs.find(d => d.name.toLowerCase() === designSearchTerm.toLowerCase()) && (
                            <p className="text-xs text-blue-600 mt-1">
                              ✓ Custom design: "{designSearchTerm}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="warehouse">Warehouse</Label>
                        <div className="relative" ref={warehouseSearchRef}>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Type warehouse name or search existing warehouses..."
                              value={warehouseSearchTerm}
                              onChange={(e) => handleWarehouseSearchChange(e.target.value)}
                              onFocus={() => setShowWarehouseSuggestions(true)}
                              onKeyDown={handleKeyDown}
                              className="pl-10 pr-10"
                            />
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          {/* Warehouse Suggestions Dropdown */}
                          {showWarehouseSuggestions && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {filteredWarehouses.length === 0 ? (
                                <div className="p-4 text-muted-foreground text-sm">
                                  {warehouseSearchTerm ? "No warehouses found" : "No warehouses available"}
                                </div>
                              ) : (
                                <>
                                  {/* Existing Warehouses */}
                                  {filteredWarehouses.map((warehouse) => (
                                    <div
                                      key={warehouse.id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                      onClick={() => handleWarehouseSelect(warehouse)}
                                    >
                                      <div>
                                        <span className="font-medium">{warehouse.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">({warehouse.location})</span>
                                      </div>
                                      {stockDetails.warehouse === warehouse.id && (
                                        <Check className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  ))}
                                  
                                  {/* Add New Warehouse Option */}
                                  {warehouseSearchTerm && !filteredWarehouses.find(w => 
                                    `${w.name} - ${w.location}`.toLowerCase() === warehouseSearchTerm.toLowerCase()
                                  ) && (
                                    <>
                                      <div className="border-t border-gray-200 my-1"></div>
                                      <div
                                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-blue-600"
                                        onClick={() => {
                                          // Add new warehouse to the list
                                          const newWarehouse = {
                                            id: `WH-${Date.now()}`,
                                            name: warehouseSearchTerm,
                                            location: "Custom Location"
                                          };
                                          // Update the warehouses array (you might want to persist this)
                                          warehouses.push(newWarehouse);
                                          handleWarehouseSelect(newWarehouse);
                                        }}
                                      >
                                        <Plus className="h-4 w-4" />
                                        <span>Add "{warehouseSearchTerm}" as new warehouse</span>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Show when custom warehouse is entered */}
                        {warehouseSearchTerm && !warehouses.find(w => 
                          `${w.name} - ${w.location}`.toLowerCase() === warehouseSearchTerm.toLowerCase()
                        ) && (
                          <p className="text-xs text-blue-600 mt-1">
                            ✓ Custom warehouse: "{warehouseSearchTerm}"
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Stock Variants */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Stock Variants</CardTitle>
                      <CardDescription>
                        Add different colors and quantities
                      </CardDescription>
                    </div>
                    <Button onClick={addVariant} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variants.map((variant, index) => (
                    <div
                      key={index}
                      className="flex gap-4 items-end p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-2">
                        <Label>Color</Label>
                        {getAvailableColorsForVariant(index).length > 0 ? (
                          <Select
                            value={variant.color}
                            onValueChange={(value) =>
                              updateVariant(index, "color", value)
                            }
                            disabled={!selectedProduct}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={selectedProduct ? "Select color" : "Select product first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableColorsForVariant(index).map((color) => (
                                <SelectItem key={color} value={color}>
                                  {color}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Enter color"
                            value={variant.color}
                            onChange={(e) =>
                              updateVariant(index, "color", e.target.value)
                            }
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={variant.quantity}
                          onChange={(e) =>
                            updateVariant(index, "quantity", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={variant.unit}
                          onValueChange={(value) =>
                            updateVariant(index, "unit", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meters">Meters</SelectItem>
                            <SelectItem value="sets">Sets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {variants.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          className="text-red-600"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}

                  {variants.some((v) => v.unit === "sets") && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                      <p className="font-medium">Set Conversion:</p>
                      <p>• 1 Set (3 colors) = 180 meters (60m per color)</p>
                      <p>• 1 Set (2 colors) = 120 meters (60m per color)</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>
                    Extra details about this stock entry
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-number">Batch Number</Label>
                      <Input
                        id="batch-number"
                        placeholder="BTH-2024-001"
                        value={addtionalInfo.batchNumber}
                        onChange={(e) =>
                          setAddtionalInfo({
                            ...addtionalInfo,
                            batchNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quality-grade">Quality Grade</Label>
                      <Select
                        value={addtionalInfo.qualityGrade}
                        onValueChange={(value) =>
                          setAddtionalInfo({
                            ...addtionalInfo,
                            qualityGrade: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes..."
                      rows={3}
                      value={addtionalInfo.notes}
                      onChange={(e) =>
                        setAddtionalInfo({
                          ...addtionalInfo,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stock Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Summary</CardTitle>
                  <CardDescription>Overview of stock entry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {stockType === "gray" && (
                      <Package className="h-4 w-4 text-blue-500" />
                    )}
                    {stockType === "factory" && (
                      <Factory className="h-4 w-4 text-orange-500" />
                    )}
                    {stockType === "design" && (
                      <Palette className="h-4 w-4 text-green-500" />
                    )}
                    <Badge variant="outline">
                      {stockType.charAt(0).toUpperCase() + stockType.slice(1)}{" "}
                      Stock
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {selectedProduct && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Selected Product
                        </span>
                        <span className="font-medium">
                          {selectedProduct}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Variants
                      </span>
                      <span className="font-medium">{variants.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Quantity
                      </span>
                      <span className="font-medium">
                        {getTotalQuantity().toLocaleString()} meters
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entry Date</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Type Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Type Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {stockType === "gray" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Gray Stock</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unfinished fabric received from factories. Requires
                        further processing.
                      </p>
                    </div>
                  )}

                  {stockType === "factory" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Factory Stock</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Stock currently being processed at factories. Track
                        processing stages.
                      </p>
                    </div>
                  )}

                  {stockType === "design" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Design Stock</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Finished products ready for sale. Stored in warehouses.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getTotalQuantity().toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Meters
                    </p>
                  </div>

                  {variants.some((v) => v.unit === "sets") && (
                    <div className="text-center">
                      <div className="text-lg font-medium text-blue-600">
                        {variants
                          .filter((v) => v.unit === "sets")
                          .reduce(
                            (sum, v) =>
                              sum + (Number.parseFloat(v.quantity) || 0),
                            0
                          )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Sets
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Adding..." : "Add Stock"}
            </Button>
            {error && <span className="text-red-500 ml-4">{error}</span>}
            {success && (
              <span className="text-green-600 ml-4">
                Stock added successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </SidebarInset>
  );
}