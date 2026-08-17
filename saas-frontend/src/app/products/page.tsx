"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Package, Tag, Loader2, X, UploadCloud, PenTool, Edit3, Trash2, Film } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Khởi tạo Supabase Client
const supabase = createClient("https://wsgjryobqfayxhdhujki.supabase.co", "sb_publishable__cTnEl5USBaraE6p6P0WDw_Q37Hmye7");

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", skuInternal: "", totalStock: "", imageUrl: "", productUrl: ""
  });

  const workspaceId = "workspace-01";

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/products?workspaceId=${workspaceId}`);
      setProducts(res.data || []);
    } catch (error) { console.error("Lỗi lấy sản phẩm:", error); }
  };

  useEffect(() => { fetchProducts(); }, []);

  // HÀM XỬ LÝ UPLOAD (Hỗ trợ cả Ảnh và Video)
  const handleUploadMedia = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      setNewProduct({ ...newProduct, imageUrl: publicUrl });
    } else {
        alert("Lỗi upload: " + error.message);
    }
    setUploading(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...newProduct, price: Number(newProduct.price), totalStock: Number(newProduct.totalStock), workspaceId };
      if (editingId) {
        await axios.patch(`http://localhost:3001/products/${editingId}`, payload);
        alert("Đã cập nhật sản phẩm!");
      } else {
        await axios.post("http://localhost:3001/products", payload);
        alert("Đã thêm vào kho!");
      }
      setNewProduct({ name: "", description: "", price: "", skuInternal: "", totalStock: "", imageUrl: "", productUrl: "" });
      setEditingId(null);
      setShowForm(false);
      fetchProducts();
    } catch (e: any) {
      alert("Lỗi: " + (e.response?.data?.message || "Kiểm tra mã SKU!"));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa sản phẩm này?")) {
      await axios.delete(`http://localhost:3001/products/${id}`);
      fetchProducts();
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setNewProduct({
      name: p.name, description: p.description || "", price: p.price,
      skuInternal: p.skuInternal, totalStock: p.totalStock,
      imageUrl: p.imageUrl || "", productUrl: p.productUrl || ""
    });
    setShowForm(true);
  };

  // Hàm kiểm tra xem link có phải là video không
  const isVideo = (url: string) => url?.match(/\.(mp4|mov|avi|wmv)$/i);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3 italic text-black">
            <Package className="text-blue-600" /> QUẢN LÝ KHO
        </h1>
        <button onClick={() => { setShowForm(!showForm); if(showForm) setEditingId(null); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all">
          {showForm ? <X size={20} /> : <Plus size={20} />} {showForm ? "Đóng Form" : "Thêm sản phẩm"}
        </button>
      </div>

      {showForm && (
        <div className={`mb-10 bg-white p-8 rounded-[32px] shadow-xl border-2 transition-all ${editingId ? 'border-orange-500' : 'border-blue-500'}`}>
          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50 relative h-[300px] overflow-hidden text-black">
              {newProduct.imageUrl ? (
                <div className="w-full h-full relative">
                  {isVideo(newProduct.imageUrl) ? (
                    <video src={newProduct.imageUrl} className="w-full h-full object-cover rounded-2xl" controls />
                  ) : (
                    <img src={newProduct.imageUrl} className="w-full h-full object-cover rounded-2xl" />
                  )}
                  <button type="button" onClick={() => setNewProduct({...newProduct, imageUrl: ""})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14}/></button>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer text-slate-400">
                  <UploadCloud size={48} className="mb-2 text-blue-500" />
                  <span className="text-sm font-bold">{uploading ? "Đang tải tệp..." : "Tải lên Ảnh hoặc Video Reels"}</span>
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUploadMedia} />
                </label>
              )}
            </div>
            <div className="space-y-4">
              <input placeholder="Tên sản phẩm" className="w-full p-4 bg-slate-50 rounded-xl border outline-none focus:border-blue-500" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}/>
              <input placeholder="Link mua hàng (URL)" className="w-full p-4 bg-slate-50 rounded-xl border outline-none text-blue-600" value={newProduct.productUrl} onChange={e => setNewProduct({...newProduct, productUrl: e.target.value})}/>
              <div className="flex gap-4 text-black">
                <input type="number" placeholder="Giá" className="w-1/2 p-4 bg-slate-50 rounded-xl border outline-none text-black" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}/>
                <input placeholder="Mã SKU" className="w-1/2 p-4 bg-slate-50 rounded-xl border outline-none font-mono" required value={newProduct.skuInternal} onChange={e => setNewProduct({...newProduct, skuInternal: e.target.value})}/>
              </div>
              <input type="number" placeholder="Số lượng" className="w-full p-4 bg-slate-50 rounded-xl border outline-none" required value={newProduct.totalStock} onChange={e => setNewProduct({...newProduct, totalStock: e.target.value})}/>
              <button className={`w-full text-white font-black py-4 rounded-xl transition-all shadow-lg ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : editingId ? "CẬP NHẬT THAY ĐỔI" : "LƯU VÀO KHO"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all relative">
            <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => startEdit(p)} className="p-2 bg-white/90 text-orange-500 rounded-full shadow-md hover:bg-orange-500 hover:text-white"><Edit3 size={16}/></button>
               <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/90 text-red-500 rounded-full shadow-md hover:bg-red-500 hover:text-white"><Trash2 size={16}/></button>
            </div>
            <div className="h-56 bg-slate-200 relative">
              {p.imageUrl ? (
                isVideo(p.imageUrl) ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                     <Film className="text-white opacity-50 absolute" size={40} />
                     <video src={p.imageUrl} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <img src={p.imageUrl} className="w-full h-full object-cover" />
                )
              ) : <div className="flex items-center justify-center h-full text-slate-400">Trống</div>}
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg text-slate-800 uppercase truncate">{p.name}</h3>
              <p className="text-blue-600 font-black text-xl mt-1">{Number(p.price).toLocaleString()}đ</p>
              <button 
                onClick={() => {
                   const text = `Sản phẩm ${p.name} giá ${Number(p.price).toLocaleString()}đ. Link mua: ${p.productUrl || ''}`;
                   window.location.href = `/?topic=${encodeURIComponent(text)}&img=${p.imageUrl || ''}`;
                }}
                className="w-full mt-6 bg-purple-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-lg"
              >
                <PenTool size={18} /> {isVideo(p.imageUrl) ? "Tạo nội dung Reels" : "Tạo nội dung AI"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}