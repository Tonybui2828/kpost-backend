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
  const workspaceId = "workspace-01";

  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", skuInternal: "", 
    totalStock: "", images: [] as string[], productUrl: ""
  });

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/products?workspaceId=${workspaceId}`);
      setProducts(res.data || []);
    } catch (error) { console.error("Lỗi lấy sản phẩm:", error); }
  }, [API_URL, workspaceId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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

  // NÚT CHUYỂN DỮ LIỆU SANG AI
  const handleGoToAI = (p: any) => {
    const imagesStr = (p.images && p.images.length > 0) ? p.images.join(',') : (p.imageUrl || "");
    const topic = `${p.name}. ${p.description || ''}`;
    
    localStorage.setItem('pendingAIPost_topic', topic);
    if (imagesStr) localStorage.setItem('pendingAIPost_imgs', imagesStr);
    
    window.location.href = `/`; // Chuyển sang trang chủ (Trang AI)
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3 italic text-black uppercase tracking-tighter">
            <Package className="text-blue-600" size={32} /> QUẢN LÝ KHO HÀNG
        </h1>
        <button onClick={() => { setShowForm(!showForm); if(showForm) setEditingId(null); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl transition-all">
          {showForm ? <X size={20} /> : <Plus size={20} />} {showForm ? "ĐÓNG FORM" : "THÊM SẢN PHẨM MỚI"}
        </button>
      </div>

      {showForm && (
        <div className="mb-10 bg-white p-8 rounded-[40px] shadow-2xl border-2 border-blue-500">
          <form onSubmit={handleSaveProduct} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex justify-between">
                   <span>Media (Ảnh/Video) ({newProduct.images.length}/10)</span>
                   {uploading && <span className="text-blue-600 animate-pulse italic">Đang tải...</span>}
                </label>
                <div className="grid grid-cols-5 gap-3 p-4 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 min-h-[200px]">
                    {newProduct.images.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden shadow-md group border-2 border-white bg-slate-900">
                            {isVideo(url) ? <video src={url} className="w-full h-full object-cover opacity-90" muted loop autoPlay playsInline /> : <img src={url} className="w-full h-full object-cover" alt="product" />}
                            {isVideo(url) && <Film className="absolute bottom-1 left-1 text-white shadow-sm" size={14} />}
                            <button type="button" onClick={() => setNewProduct({...newProduct, images: newProduct.images.filter((_, i) => i !== idx)})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 z-10"><X size={10}/></button>
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
                   <textarea placeholder="Chất liệu, tính năng..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none font-medium" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-black">
              <input type="number" placeholder="Giá bán" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-blue-600" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}/>
              <input placeholder="Mã SKU" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-mono" value={newProduct.skuInternal} onChange={e => setNewProduct({...newProduct, skuInternal: e.target.value})}/>
              <input type="number" placeholder="Tồn kho" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={newProduct.totalStock} onChange={e => setNewProduct({...newProduct, totalStock: e.target.value})}/>
              <button className="w-full text-white bg-blue-600 font-black py-4 rounded-2xl shadow-xl">{loading ? "ĐANG LƯU..." : "LƯU VÀO KHO"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-black">
        {products.map((p: any) => {
          const firstMedia = p.images?.[0] || p.imageUrl || "";
          const hasVideo = p.images?.some((url: string) => isVideo(url)) || isVideo(p.imageUrl);
          return (
          <div key={p.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all relative">
            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => startEdit(p)} className="p-2 bg-white/90 text-orange-500 rounded-xl shadow-md border hover:bg-orange-500 hover:text-white"><Edit3 size={18}/></button>
               <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/90 text-red-500 rounded-xl shadow-md border hover:bg-red-500 hover:text-white"><Trash2 size={18}/></button>
            </div>
            <div className="h-64 bg-slate-900 relative overflow-hidden">
                {isVideo(firstMedia) ? <video src={firstMedia} className="w-full h-full object-cover opacity-90" muted loop autoPlay playsInline /> : <img src={firstMedia} className="w-full h-full object-cover" alt={p.name} />}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2">
                    {hasVideo ? <Film size={12} className="text-pink-400" /> : <ImageIcon size={12} />} {p.images?.length || 1} FILE
                </div>
            </div>
            <div className="p-8">
              <h3 className="font-black text-xl text-slate-800 uppercase truncate mb-1">{p.name}</h3>
              <p className="text-blue-600 font-black text-2xl tracking-tighter">{Number(p.price).toLocaleString()}đ</p>
              <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[60px]">
                 <p className="text-[11px] text-slate-500 font-medium line-clamp-2 italic">"{p.description || 'Chưa có mô tả chi tiết...'}"</p>
              </div>
              <button onClick={() => handleGoToAI(p)} className="w-full mt-6 bg-slate-900 text-white font-black py-4 rounded-[20px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg">
                <PenTool size={18} /> ĐĂNG BÀI VỚI AI 🚀
              </button>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}