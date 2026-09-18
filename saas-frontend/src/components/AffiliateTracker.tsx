"use client";
import { useEffect } from "react";

export default function AffiliateTracker() {
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        localStorage.setItem("kpost_affiliate_ref", refCode);
        console.log("Đã lưu mã giới thiệu:", refCode);
      }
    } catch (error) {
      console.error("Lỗi bắt ref:", error);
    }
  }, []);

  return null;
}