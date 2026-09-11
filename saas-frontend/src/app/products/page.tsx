"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Plus, Package, Tag, Loader2, X, UploadCloud, 
  PenTool, Edit3, Trash2, Film, Image as ImageIcon, FileText, Video
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase Client
const supabase = createClient("https://wsgjryobqfayxhdhujki.supabase.co", "sb_publishable__cTnEl5USBaraE6p6P0WDw_Q37Hmye7");

export default function ProductsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", skuInternal: "", 
    totalStock: "", images: [] as string[], productUrl: ""
  });

  // 1. SỬA LỖI HIỂN THỊ DỮ LIỆU KHI CHƯA ĐĂNG NHẬP
  useEffect(() => {
    const id = localStorage.getItem("workspaceId");
    if (id) {
      setWorkspaceId(id);
    } else {
      // Bắt buộc để trống nếu chưa đăng nhập (Không gán "workspace-01")
      setWorkspaceId(""); 
    }
  }, []);

  // 2. CHẶN GỌI API NẾU KHÔNG CÓ WORKSPACE_ID
  const fetchProducts = useCallback(async () => {
    if (!workspaceId) {
      setProducts([]); // Làm rỗng danh sách
      return; 
    } 
    try {
      const res = await axios.get(`${API_URL}/products?workspaceId=${workspaceId}`);
      setProducts(res.data || []);
    } catch (error) { console.error("Lỗi lấy sản phẩm:", error); }
  }, [API_URL, workspaceId]);

  useEffect(() => { 
    if (workspaceId) {
      fetchProducts(); 
    } else {
      setProducts([]); // Đảm bảo làm rỗng khi workspaceId rỗng
    }
  }, [workspaceId, fetchProducts]);

  const isVideo = (url: string) => url ? url.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i) !== null : false;

  const handleUploadMultiple = async (e: any) => {
    const files = Array.from(e.target.files);
    if (newProduct.images.length + files.length > 10) return alert("Tối đa 10 file!");
    setUploading(true);
    const newUrls = [...newProduct.images];
    for (const file of files as File[]) {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        newUrls.push(data.publicUrl);
      }
    }
    setNewProduct({ ...newProduct, images: newUrls });
    setUploading(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return alert("Vui lòng đăng nhập để sử dụng tính năng này!");

    setLoading(true);
    try {
      const payload = { ...newProduct, price: Number(newProduct.price), totalStock: Number(newProduct.totalStock), workspaceId };
      if (editingId) {
        await axios.patch(`${API_URL}/products/${editingId}`, payload);
        alert("Cập nhật thành công!");
      } else {
        await axios.post(`${API_URL}/products`, payload);
        alert("Đã thêm sản phẩm!");
      }
      setNewProduct({ name: "", description: "", price: "", skuInternal: "", totalStock: "", images: [], productUrl: "" });
      setEditingId(null);
      setShowForm(false);
      fetchProducts();
    } catch (e: any) { alert("Lỗi lưu sản phẩm!"); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa sản phẩm này?")) {
      await axios.delete(`${API_URL}/products/${id}`);
      fetchProducts();
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setNewProduct({
      name: p.name, description: p.description || "", price: p.price, skuInternal: p.skuInternal, 
      totalStock: p.totalStock, images: p.images || (p.imageUrl ? [p.imageUrl] : []), productUrl: p.productUrl || ""
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToAI = (p: any) => {
    const imagesStr = (p.images && p.images.length > 0) ? p.images.join(',') : (p.imageUrl || "");
    const topic = `${p.name}. ${p.description || ''}`;
    
    localStorage.setItem('pendingAIPost_topic', topic);
    if (imagesStr) localStorage.setItem('pendingAIPost_imgs', imagesStr);
    
    window.location.href = `/`;
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 md:gap-3 italic text-black uppercase tracking-tighter">
            <Package className="text-blue-600 w-6 h-6 md:w-8 md:h-8" /> QUẢN LÝ KHO HÀNG
        </h1>
        <button onClick={() => { setShowForm(!showForm); if(showForm) setEditingId(null); }} 
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl transition-all">
          {showForm ? <X size={20} /> : <Plus size={20} />} {showForm ? "ĐÓNG FORM" : "THÊM SẢN PHẨM MỚI"}
        </button>
      </div>

      {/* 3. HIỂN THỊ CẢNH BÁO NẾU CHƯA ĐĂNG NHẬP */}
      {!workspaceId && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 font-medium flex items-center justify-center flex-col gap-2">
          <p>Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.</p>
          <p className="text-sm">Vui lòng đăng nhập để xem và quản lý sản phẩm của bạn.</p>
        </div>
      )}

      {showForm && workspaceId && (
        <div className="mb-8 md:mb-10 bg-white p-5 md:p-8 rounded-[24px] md:rounded-[40px] shadow-2xl border border-blue-500/30">
          <form onSubmit={handleSaveProduct} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex justify-between">
                   <span>Media (Ảnh/Video) ({newProduct.images.length}/10)</span>
                   {uploading && <span className="text-blue-600 animate-pulse italic">Đang tải...</span>}
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200 min-h-[140px]">
                    {newProduct.images.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden shadow-md group border-2 border-white bg-slate-900">
                            {isVideo(url) ? <video src={url} className="w-full h-full object-cover opacity-90" muted loop autoPlay playsInline /> : <img src={url} className="w-full h-full object-cover" alt="product" />}
                            {isVideo(url) && <Film className="absolute bottom-1 left-1 text-white shadow-sm" size={14} />}
                            <button type="button" onClick={() => setNewProduct({...newProduct, images: newProduct.images.filter((_, i) => i !== idx)})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 z-10"><X size={12}/></button>
                        </div>
                    ))}
                    {newProduct.images.length < 10 && (
                        <label className="aspect-square rounded-2xl bg-white border-2 border-dashed border-blue-200 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-all text-blue-400 group relative">
                            <UploadCloud size={24} className="group-hover:scale-110 transition-transform mb-1" />
                            <span className="text-[8px] font-bold">Thêm Media</span>
                            <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleUploadMultiple} />
                        </label>
                    )}
                </div>
              </div>
              <div className="space-y-4 text-black">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tên sản phẩm</label>
                   <input placeholder="Nhập tên sản phẩm..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}/>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mô tả chi tiết</label>
                   <textarea placeholder="Chất liệu, tính năng..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-28 md:h-32 resize-none font-medium" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 pt-4 md:pt-6 border-t border-slate-100 text-black">
              <input type="number" placeholder="Giá bán (đ)" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-blue-600" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}/>
              <input placeholder="Mã SKU" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-mono" value={newProduct.skuInternal} onChange={e => setNewProduct({...newProduct, skuInternal: e.target.value})}/>
              <input type="number" placeholder="Tồn kho" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={newProduct.totalStock} onChange={e => setNewProduct({...newProduct, totalStock: e.target.value})}/>
              <button className="w-full text-white bg-blue-600 font-black py-4 rounded-2xl shadow-xl">{loading ? "ĐANG LƯU..." : "LƯU VÀO KHO"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid sản phẩm tự động co giãn 1 cột trên mobile */}
      {workspaceId && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 text-black">
          {products.map((p: any) => {
            const firstMedia = p.images?.[0] || p.imageUrl || "";
            const hasVideo = p.images?.some((url: string) => isVideo(url)) || isVideo(p.imageUrl);
            return (
            <div key={p.id} className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all relative">
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => startEdit(p)} className="p-2 bg-white/90 text-orange-500 rounded-xl shadow-md border hover:bg-orange-500 hover:text-white"><Edit3 size={18}/></button>
                 <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/90 text-red-500 rounded-xl shadow-md border hover:bg-red-500 hover:text-white"><Trash2 size={18}/></button>
              </div>
              <div className="h-56 md:h-64 bg-slate-900 relative overflow-hidden">
                  {isVideo(firstMedia) ? <video src={firstMedia} className="w-full h-full object-cover opacity-90" muted loop autoPlay playsInline /> : <img src={firstMedia} className="w-full h-full object-cover" alt={p.name} />}
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2">
                      {hasVideo ? <Film size={12} className="text-pink-400" /> : <ImageIcon size={12} />} {p.images?.length || 1} FILE
                  </div>
              </div>
              <div className="p-5 md:p-8">
                <h3 className="font-black text-lg md:text-xl text-slate-800 uppercase truncate mb-1">{p.name}</h3>
                <p className="text-blue-600 font-black text-xl md:text-2xl tracking-tighter">{Number(p.price).toLocaleString()}đ</p>
                <div className="mt-3 md:mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[60px]">
                   <p className="text-[11px] text-slate-500 font-medium line-clamp-2 italic">"{p.description || 'Chưa có mô tả chi tiết...'}"</p>
                </div>
                <button onClick={() => handleGoToAI(p)} className="w-full mt-4 md:mt-6 bg-slate-900 text-white font-black py-3 md:py-4 rounded-[16px] md:rounded-[20px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg">
                  <PenTool size={18} /> ĐĂNG BÀI VỚI AI 🚀
                </button>
              </div>
            </div>
          )})}
        </div>
      )}
      
      {workspaceId && products.length === 0 && (
         <div className="text-center py-20 text-slate-400">
           <Package size={48} className="mx-auto mb-4 opacity-50" />
           <p className="font-medium">Chưa có sản phẩm nào trong kho.</p>
         </div>
      )}
    </div>
  );
}