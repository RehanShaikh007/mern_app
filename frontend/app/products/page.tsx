"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Package, Plus, Search, Grid3X3, List, Eye, Edit, AlertTriangle, CheckCircle, Clock, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react"
import Link from "next/link"
import React from "react"
import { API_BASE_URL } from "@/lib/api"

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
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTag, setSelectedTag] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [masterOpen, setMasterOpen] = React.useState(false)
  const categories = ["Cotton Fabrics", "Silk Fabrics", "Polyester Fabrics", "Blended Fabrics"]
  const tags = ["Premium", "Cotton", "Silk", "Polyester", "Designer", "Casual", "Printed", "Solid"]
  const [categoriesState, setCategoriesState] = React.useState([...categories])
  const [tagsState, setTagsState] = React.useState([...tags])
  const [newCategory, setNewCategory] = React.useState("")
  const [newTag, setNewTag] = React.useState("")
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Fetch products from backend with pagination
  const fetchProducts = async (page: number = 1, limit: number = 12) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: '-createdAt' // Sort by latest first
      });
      
      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts(data.products);
        setPagination(data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: data.products.length,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage, pagination.itemsPerPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newLimit: number) => {
    fetchProducts(1, newLimit);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const matchesTag = selectedTag === "all" || product.tags.includes(selectedTag)
    return matchesSearch && matchesCategory && matchesTag
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "low":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "out":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default">Available</Badge>
      case "low":
        return <Badge variant="secondary">Low Stock</Badge>
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const productStats = {
    total: products.length,
    totalVariants: products.reduce((sum, p) => sum + p.variants.length, 0),
    totalStock: products.reduce((sum, p) => 
      sum + p.variants.reduce((vSum, v) => vSum + (v.stockInMeters || 0), 0), 0
    ),
    categories: new Set(products.map(p => p.category)).size,
  }

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
              <BreadcrumbPage>Products</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Products</h2>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <Link href="/products/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productStats.total}</div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{productStats.totalVariants}</div>
              <p className="text-xs text-muted-foreground">Color variants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{productStats.totalStock.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Meters available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <AlertTriangle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">{productStats.categories}</div>
              <p className="text-xs text-muted-foreground">Product types</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesState.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tagsState.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Products Display */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading products...</span>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error loading products</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchProducts()}>
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card key={product._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={product.images?.[0] || "/placeholder.svg"}
                        alt={product.productName}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setExpandedImage(product.images?.[0] ?? "")
                          setCurrentImageIndex(0)
                        }}
                      />
                      <div className="absolute top-2 right-2">{getStatusIcon(product.status || "unknown")}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{product.productName}</h3>
                        {/* {getStatusBadge(product.status || "unknown")} */}
                      </div>

                      <p className="text-xs text-muted-foreground">{product.category}</p>

                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {product.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.tags.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm">
                        {/* <p className="font-medium">
                          {Array.isArray(product.variants) ? product.variants.reduce((sum, v) => sum + (v.stockInMeters || v.stock || 0), 0) : 0} {product.unit || "units"} total
                        </p> */}
                        <p className="font-medium">
                          {product.variants.length} color{product.variants.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/products/${product._id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full bg-transparent">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/products/${product._id}/edit`} className="flex-1">
                          <Button size="sm" className="w-full">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Products List</CardTitle>
              <CardDescription>All products in your inventory</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Stock</th>
                      <th className="text-left p-4 font-medium">Variants</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product._id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images?.[0] || "/placeholder.svg"}
                              alt={product.productName}
                              className="w-12 h-12 object-cover rounded cursor-pointer"
                              onClick={() => {
                                setExpandedImage(product.images?.[0] ?? "")
                                setCurrentImageIndex(0)
                              }}
                            />
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-muted-foreground">{product._id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{product.category}</td>
                        <td className="p-4">
                          {Array.isArray(product.variants) ? product.variants.reduce((sum, v) => sum + (v.stockInMeters || v.stock || 0), 0) : 0} {product.unit || "units"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {product.variants.slice(0, 3).map((variant) => (
                              <Badge key={variant.color} variant="outline" className="text-xs">
                                {variant.color}
                              </Badge>
                            ))}
                            {product.variants.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{product.variants.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(product.status || "unknown")}
                            {getStatusBadge(product.status || "unknown")}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Link href={`/products/${product._id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/products/${product._id}/edit`}>
                              <Button size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredProducts.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">No products match your current filters</p>
              <Link href="/products/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pagination Controls */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} products
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={!pagination.hasNextPage}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Image Expansion Modal */}
        {expandedImage && (
          <Dialog open={!!expandedImage} onOpenChange={() => {
            setExpandedImage(null)
            setCurrentImageIndex(0)
          }}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Product Images</DialogTitle>
              </DialogHeader>
              <div className="relative">
                {/* Main Image */}
                <div className="flex justify-center mb-4">
                  <img
                    src={expandedImage || "/placeholder.svg"}
                    alt="Expanded product"
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>

                {/* Navigation Arrows */}
                {(() => {
                  // Find the current product
                  const currentProduct = products.find(p => 
                    p.images?.includes(expandedImage) || 
                    (p.images?.length === 0 && expandedImage === "/placeholder.svg")
                  )
                  const productImages = currentProduct?.images || []
                  
                  if (productImages.length > 1) {
                    return (
                      <>
                        {/* Previous Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                          onClick={() => {
                            const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : productImages.length - 1
                            setCurrentImageIndex(newIndex)
                            setExpandedImage(productImages[newIndex])
                          }}
                        >
                          ←
                        </Button>

                        {/* Next Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                          onClick={() => {
                            const newIndex = currentImageIndex < productImages.length - 1 ? currentImageIndex + 1 : 0
                            setCurrentImageIndex(newIndex)
                            setExpandedImage(productImages[newIndex])
                          }}
                        >
                          →
                        </Button>

                        {/* Image Indicators */}
                        <div className="flex justify-center gap-2 mt-4">
                          {productImages.map((_, index) => (
                            <button
                              key={index}
                              className={`w-3 h-3 rounded-full transition-colors ${
                                index === currentImageIndex 
                                  ? 'bg-primary' 
                                  : 'bg-muted hover:bg-muted-foreground'
                              }`}
                              onClick={() => {
                                setCurrentImageIndex(index)
                                setExpandedImage(productImages[index])
                              }}
                            />
                          ))}
                        </div>

                        {/* Image Counter */}
                        <div className="text-center text-sm text-muted-foreground mt-2">
                          {currentImageIndex + 1} of {productImages.length}
                        </div>

                        {/* Thumbnail Strip */}
                        <div className="flex justify-center gap-2 mt-4">
                          {productImages.map((image, index) => (
                            <button
                              key={index}
                              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                index === currentImageIndex 
                                  ? 'border-primary scale-105' 
                                  : 'border-transparent hover:border-muted-foreground'
                              }`}
                              onClick={() => {
                                setCurrentImageIndex(index)
                                setExpandedImage(image)
                              }}
                            >
                              <img
                                src={image || "/placeholder.svg"}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </>
                    )
                  }
                  return null
                })()}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SidebarInset>
  )
}
