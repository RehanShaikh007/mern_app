"use client";

import type React from "react";

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
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Plus, Save, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { API_BASE_URL } from "@/lib/api";

interface Variant {
  color: string;
  pricePerMeters: number;
  stockInMeters: number;
}

interface StockInfo {
  minimumStock: number;
  reorderPoint: number;
  storageLocation: string;
}

interface ProductFormData {
  productName: string;
  name?: string;
  category: string;
  description?: string;
  tags: string[];
  variants: Variant[];
  stockInfo: StockInfo;
  unit: 'METERS' | 'SETS';
  images?: string[];
  isActive: boolean;
  minStock?: number;
  reorderPoint?: number;
  storageLocation?: string;
}
// Define Product type based on backend schema
interface Product {
  _id: string;
  productName: string;
  category: string;
  tags: string[];
  variants: any[];
  images?: string[];
  status?: string;
  stockInfo?: {
    minimumStock: number;
    reorderPoint: number;
    storageLocation: string;
  };
  unit?: string;
  description?: string;
  [key: string]: any;
}

export default function EditProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const productId = params.id as string;

  const [formData, setFormData] = useState<any>({
    productName: "",
    category: "",
    tags: [],
    variants: [],
    images: [],
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/products/${productId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch product");
        }
        const data = await response.json();
        // Map backend fields to form fields as needed
        setFormData({
          ...data.product,
          variants: data.product.variants || [],
          name: data.product.productName,
          minStock: data.product.stockInfo?.minimumStock,
        });
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    setFormData((prev: any) => {
      const newVariants = [...prev.variants];
      newVariants[index] = {
        ...newVariants[index],
        [field]: value
      };
      return {
        ...prev,
        variants: newVariants
      };
    });
  };
  
  const addVariant = () => {
    setFormData((prev: any) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { color: '', pricePerMeters: 0, stockInMeters: 0 }
      ]
    }));
  };
  
  const removeVariant = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      variants: prev.variants.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (!formData) return;
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...(prev[parent] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const addTag = (tag: string) => {
    if (!formData) return;
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev: any) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    if (!formData) return;
    setFormData((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove),
    }));
  };

  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true);
    try {
      const formData = new FormData();
      
      // Append all files to FormData with 'images' field name
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      
      const response = await fetch(`${API_BASE_URL}/products/upload-images`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      const result = await response.json();
      
      if (result.success && result.images) {
        setFormData((prev: any) => ({
          ...prev,
          images: [...(prev.images || []), ...result.images],
        }));
      }
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      // Prepare payload matching backend schema
      const payload = {
        productName: formData.name || formData.productName,
        category: formData.category,
        description: formData.description,
        tags: formData.tags,
        variants: formData.variants.map(v => ({
          color: v.color,
          pricePerMeters: Number(v.pricePerMeters),
          stockInMeters: Number(v.stockInMeters)
        })),
        stockInfo: {
          minimumStock: Number(formData.minStock) || 0,
          reorderPoint: Number(formData.reorderPoint) || 0,
          storageLocation: formData.storageLocation || '',
        },
        unit: formData.unit || 'METERS',
        images: formData.images || [],
        isActive: formData.isActive
      };
  
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }
  
      toast({ title: "Product updated", description: `${payload.productName} has been updated successfully.` });
      setTimeout(() => router.push('/products'), 900);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({ title: "Failed to update product", description: err.message, variant: "destructive" });
      } else {
        setError('Unknown error');
        toast({ title: "Failed to update product", description: 'Unknown error', variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    try {
      setDeleting(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete product');
      }
      router.push('/products');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete product');
      }
    } finally {
      setDeleting(false);
    }
  };

  const categories = ["Cotton", "Silk", "Polyester", "Linen", "Wool", "Blend"];
  const predefinedTags = [
    "Premium",
    "Designer",
    "Casual",
    "Formal",
    "Summer",
    "Winter",
    "Blend",
    "Print",
    "Solid",
    "Soft",
    "Durable",
  ];

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!formData) return <div>Product not found.</div>;

  const setSize = formData.variants === "3-color" ? 180 : 120;

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
              <BreadcrumbLink href={`/products/${productId}`}>
                {formData.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Edit Product</h2>
            <p className="text-muted-foreground">
              Update product information and settings
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential product details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={4}
                  />
                </div>

                {/* <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      handleInputChange("isActive", checked)
                    }
                  />
                  <Label htmlFor="active">Active Product</Label>
                </div> */}
              </CardContent>
            </Card>

            {/* Variants & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
                <CardDescription>
                  Manage product color variants and pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.variants.map((variant: any, index: number) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`color-${index}`}>Color</Label>
                      <Input
                        id={`color-${index}`}
                        value={variant.color || ""}
                        onChange={(e) =>
                          handleVariantChange(index, "color", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`price-${index}`}>
                        Price per Meter (₹)
                      </Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        value={variant.pricePerMeters || 0}
                        onChange={(e) =>
                          handleVariantChange(
                            index,
                            "pricePerMeters",
                            parseFloat(e.target.value)
                          )
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      {/* <Label htmlFor={`stock-${index}`}>Stock (meters)</Label> */}
                      <div className="flex gap-2">
                        {/* <Input
                          id={`stock-${index}`}
                          type="number"
                          value={variant.stockInMeters || 0}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "stockInMeters",
                              parseFloat(e.target.value)
                            )
                          }
                          required
                        /> */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeVariant(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Add tags to help categorize and search for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTag(newTag)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Quick Add:</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload and manage product images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.images.map((image: string, index: number) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-muted rounded-lg overflow-hidden"
                      >
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              images: prev.images.filter(
                                (_: string, i: number) => i !== index
                              ),
                            }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop images here, or click to browse
                    </p>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={triggerFileInput}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? 'Uploading...' : 'Choose Files'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>

        {/* Danger Zone: Delete Product */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground"></div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Product</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the product
                  and remove it from the product list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>No</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SidebarInset>
  );
}
