"use client";

import type React from "react";

import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, X, Plus, ArrowLeft, Save, Tag, Loader2, Router } from "lucide-react";
import Link from "next/link";
import { createProduct, uploadProductImages } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";


export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [variants, setVariants] = useState([
    { color: "", price: "", stock: "" },
  ]);
  const [unit, setUnit] = useState("METERS");

  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    category: "",
    unit: "METERS",
    stockInfo: {
      minimumStock: 0,
      reorderPoint: 0,
      storageLocation: "",
    },
  });
  const [customTag, setCustomTag] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  // handle input change
  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // handle stock change
  const handleStockInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      stockInfo: {
        ...prev.stockInfo,
        [id]:
          id === "minimumStock" || id === "reorderPoint"
            ? Number(value) || 0 // Ensure number conversion
            : value,
      },
    }));
  };

  // handle category change
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  // Handle unit change
  const handleUnitChange = (value: string) => {
    setUnit(value);
    setFormData((prev) => ({
      ...prev,
      unit: value,
    }));
  };

  // handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate required fields
      const requiredFields = [
        { field: formData.productName, message: "Product name is required" },
        { field: formData.category, message: "Category is required" },
        {
          field: formData.stockInfo.storageLocation,
          message: "Storage location is required",
        },
      ];

      for (const { field, message } of requiredFields) {
        if (!field) {
          toast({ title: "Missing information", description: message, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      }
      // Require at least one tag
      if (selectedTags.length === 0) {
        toast({ title: "Tags required", description: "Please select at least one tag", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      // Require at least one product image
      if (!productImages || productImages.length === 0) {
        toast({ title: "Images required", description: "Please upload at least one product image", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      // Validate variants: must have at least one, and each must have color, price>0, stock provided
      if (variants.length === 0) {
        toast({ title: "Variant required", description: "Add at least one variant (color, price, stock)", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      for (const [idx, v] of variants.entries()) {
        const priceNum = parseFloat(v.price);
        const stockNum = parseFloat(v.stock);
        if (!v.color) {
          toast({ title: "Invalid variant", description: `Variant ${idx + 1}: Color is required`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
          toast({ title: "Invalid variant", description: `Variant ${idx + 1}: Price must be greater than 0`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        if (!Number.isFinite(stockNum) || stockNum < 0) {
          toast({ title: "Invalid variant", description: `Variant ${idx + 1}: Stock must be 0 or greater`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      }

      // Format variants to match backend schema
      const formattedVariants = variants.map((variant) => ({
        color: variant.color,
        pricePerMeters: parseFloat(variant.price),
        stockInMeters: parseFloat(variant.stock),
      }));
      // Prepare complete product data
      const productData = {
        ...formData,
        variants: formattedVariants,
        tags: selectedTags,
        images: productImages,
      };

      // Validate required fields
      if (
        !productData.productName ||
        !productData.category ||
        !productData.unit
      ) {
        toast({ title: "Missing information", description: "Please fill in all required fields", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // Variants already validated above
       
      const response = await createProduct(productData);
      if (response.success) {
        toast({ title: "Product created", description: `${productData.productName} has been added successfully.` });
        setTimeout(() => router.push('/products'), 900);
      } else {
        toast({ title: "Failed to create product", description: response.message || "Unknown error", variant: "destructive" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Error submitting product:", message);
      toast({ title: "Error", description: `An error occurred while creating the product: ${message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const predefinedTags = [
    "Premium",
    "Cotton",
    "Silk",
    "Polyester",
    "Designer",
    "Casual",
    "Formal",
    "Summer",
    "Winter",
    "Printed",
    "Solid",
    "Textured",
    "Lightweight",
    "Heavy",
  ];

  const categories = [
    "Cotton Fabrics",
    "Silk Fabrics",
    "Polyester Fabrics",
    "Blended Fabrics",
    "Designer Prints",
    "Solid Colors",
    "Textured Fabrics",
    "Seasonal Collection",
  ];

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const addVariant = () => {
    setVariants([...variants, { color: "", price: "", stock: "" }]);
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

  // const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files
  //   if (files) {
  //     // In real app, upload to server and get URLs
  //     const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
  //     setProductImages([...productImages, ...newImages])
  //   }
  // }

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleCustomTag = () => {
    const newTag = customTag.trim();
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags([...selectedTags, newTag]);
      setCustomTag("");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    console.log('Upload triggered');

    const files = e.target.files;
    console.log('Selected files:', files);
    if (!files || files.length === 0){
      console.log('No files selected');
      return;
    }
    // Check file sizes
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${files[i].name} exceeds 5MB limit`, variant: "destructive" });
        return;
      }
    }

    try {
      setIsUploading(true);
      // Check if we've reached the 5-image limit
      if (productImages.length + files.length > 5) {
        toast({ title: "Image limit reached", description: "You can upload a maximum of 5 images", variant: "destructive" });
        return;
      }

      const result = await uploadProductImages(files);

      if (result.images && result.images.length > 0) {
        setProductImages((prev) => [...prev, ...result.images]);
      } else {
        throw new Error("No images returned from server");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Error uploading images:", message);
      toast({ title: "Image upload failed", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
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
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Add Product</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <form className="flex-1 space-y-6 p-4 md:p-6" onSubmit={handleSubmit}>
        {/* Header */}

        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <p className="text-muted-foreground">
                Create a new product in your inventory
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Product
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Product Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details of your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={handleInput}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" placeholder="Auto-generated" disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter product description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInput}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={handleUnitChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="METERS">Meters</SelectItem>
                        <SelectItem value="SETS">Sets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Variants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>
                      Add different colors and their pricing
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
                      <Input
                        placeholder="Enter color"
                        value={variant.color}
                        onChange={(e) =>
                          updateVariant(index, "color", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Price per {unit}</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={variant.price}
                        onChange={(e) =>
                          updateVariant(index, "price", e.target.value)
                        }
                        min="0.01"
                        step="any"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Stock ({unit})</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={variant.stock}
                        onChange={(e) =>
                          updateVariant(index, "stock", e.target.value)
                        }
                        min="0"
                      />
                    </div>
                    {variants.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Product Images */}
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>
                  Upload product images (up to 5 images)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer bg-transparent"
                      disabled={isUploading}
                      onClick={triggerFileInput}
                    >
                      {isUploading ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Images
                        </>
                      )}
                    </Button>
                  </div>

                  {productImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {productImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Add tags to help categorize your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Available Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {predefinedTags
                      .filter((tag) => !selectedTags.includes(tag))
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => addTag(tag)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Add Custom Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Tag</DialogTitle>
                      <DialogDescription>
                        Create a new tag for this product
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter tag name"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCustomTag()
                        }
                      />
                      <Button
                        className="w-full"
                        onClick={handleCustomTag}
                        disabled={!customTag.trim()}
                      >
                        Add Tag
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Stock Information */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Information</CardTitle>
                <CardDescription>Inventory and stock details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min-stock">Minimum Stock Level</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    placeholder="0"
                    value={formData.stockInfo.minimumStock}
                    onChange={handleStockInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    placeholder="0"
                    value={formData.stockInfo.reorderPoint}
                    onChange={handleStockInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="storageLocation"
                    placeholder="Warehouse section"
                    value={formData.stockInfo.storageLocation}
                    onChange={handleStockInfo}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Variants
                  </span>
                  <span className="font-medium">{variants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Images</span>
                  <span className="font-medium">{productImages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <span className="font-medium">{selectedTags.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </SidebarInset>
  );
}
