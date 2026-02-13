/**
 * Chuẩn hóa 1 sản phẩm từ API (camelCase) hoặc JSON (snake_case) sang format dùng trong component.
 * Component dùng: product_id, product_name, product_price, product_thumb, product_quantity, product_description,
 * product_start_time, product_end_time (cho countdown & logic nút MUA).
 */
export function normalizeProduct(raw) {
    if (!raw) return null;
    return {
      product_id: raw._id ?? raw.product_id,
      product_name: raw.productName ?? raw.product_name,
      product_price: raw.productPrice ?? raw.product_price,
      product_thumb: raw.productThumb ?? raw.product_thumb,
      product_quantity: raw.productQuantity ?? raw.product_quantity,
      product_description: raw.productDescription ?? raw.product_description,
      product_start_time: raw.product_start_time ?? raw.productStartTime,
      product_end_time: raw.product_end_time ?? raw.productEndTime,
    };
  }
  
  /**
   * Chuẩn hóa mảng sản phẩm.
   */
  export function normalizeProducts(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeProduct).filter(Boolean);
  }