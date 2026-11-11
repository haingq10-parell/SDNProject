import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, imageOf, money } from "./api.js";

const EMPTY_ADDRESS = {
  fullName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  street: "",
};
const ORDER_STATES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "cancelled",
];
const PAYMENT_STATES = ["pending", "paid", "failed", "refunded"];
const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};
const STATUS_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  paid: "Đã thanh toán",
  failed: "Thanh toán lỗi",
  refunded: "Đã hoàn tiền",
};

function Icon({ name }) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.4 11.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6" />
        <circle cx="10" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" />
      </>
    ),
    revenue: (
      <>
        <path d="M3 17 9 11l4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="m18 6-12 12M6 6l12 12" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    bolt: <path d="m13 2-3 9h7L9 22l2-9H4l9-11Z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Notice({ notice, clear }) {
  if (!notice) return null;
  return (
    <div className={`notice ${notice.type}`} role="status">
      <span>{notice.message}</span>
      <button className="icon-button" onClick={clear} aria-label="Đóng">
        <Icon name="close" />
      </button>
    </div>
  );
}

function ProductTile({ product, onOpen, onAdd }) {
  const image = imageOf(product);
  return (
    <article className="product-card">
      <button
        className="product-image"
        onClick={() => onOpen(product)}
        aria-label={`Xem ${product.name}`}
      >
        {image ? (
          <img src={image} alt={product.name} />
        ) : (
          <div className="product-placeholder">
            <Icon name="bolt" />
            <span>{product.category?.name || "LINH KIỆN"}</span>
          </div>
        )}
        {product.isFeatured && <span className="featured-tag">NỔI BẬT</span>}
      </button>
      <div className="product-card-content">
        <div className="product-meta">
          <span>{product.brand?.name || "ElectroShop"}</span>
          <span className="rating">
            ★ {Number(product.ratingAvg || 0).toFixed(1)}
          </span>
        </div>
        <button className="product-title" onClick={() => onOpen(product)}>
          {product.name}
        </button>
        <div className="product-code">
          {product.sku} {product.partNumber ? `· ${product.partNumber}` : ""}
        </div>
        <div className="product-bottom">
          <div>
            <strong>{money(product.salePrice || product.price)}</strong>
            {product.salePrice > 0 && <del>{money(product.price)}</del>}
          </div>
          <button
            className="add-button"
            onClick={() => onAdd(product)}
            title="Thêm vào giỏ"
          >
            <Icon name="plus" />
          </button>
        </div>
        <div className="stock-line">
          {product.stock > 0 ? (
            <>
              <i /> Còn {product.stock} {product.unit || "cái"}
            </>
          ) : (
            <span className="danger-text">Hết hàng</span>
          )}
        </div>
      </div>
    </article>
  );
}

function Modal({ title, children, close, wide = false }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">ELECTROSHOP</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function AdminProductForm({ item, categories, brands, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({
    name: item?.name || "",
    sku: item?.sku || "",
    partNumber: item?.partNumber || "",
    slug: item?.slug || "",
    description: item?.description || "",
    category: item?.category?._id || item?.category || categories[0]?._id || "",
    brand: item?.brand?._id || item?.brand || "",
    price: item?.price ?? "",
    salePrice: item?.salePrice ?? "",
    stock: item?.stock ?? 0,
    minOrderQty: item?.minOrderQty ?? 1,
    unit: item?.unit || "cái",
    tags: (item?.tags || []).join(", "),
    images: (item?.images || []).join("\n"),
    specs: (item?.specs || []).map(({ key = "", value = "" }) => ({
      key,
      value,
    })),
    priceTiers: (item?.priceTiers || []).map(({ minQty = "", price = "" }) => ({
      minQty,
      price,
    })),
    datasheetUrl: item?.datasheetUrl || "",
    isActive: item?.isActive !== false,
    isFeatured: !!item?.isFeatured,
  }));
  const set = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));
  const setRow = (field, index, key, value) =>
    setValues((current) => ({
      ...current,
      [field]: current[field].map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    }));
  const addRow = (field, row) =>
    setValues((current) => ({ ...current, [field]: [...current[field], row] }));
  const removeRow = (field, index) =>
    setValues((current) => ({
      ...current,
      [field]: current[field].filter((_, rowIndex) => rowIndex !== index),
    }));
  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...values,
      price: Number(values.price),
      salePrice: values.salePrice === "" ? undefined : Number(values.salePrice),
      stock: Number(values.stock),
      minOrderQty: Number(values.minOrderQty),
      category: values.category,
      brand: values.brand || undefined,
      tags: values.tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      images: values.images
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      specs: values.specs
        .map(({ key, value }) => ({ key: key.trim(), value: value.trim() }))
        .filter(({ key, value }) => key && value),
      priceTiers: values.priceTiers.map(({ minQty, price }) => ({
        minQty: Number(minQty),
        price: Number(price),
      })),
    });
  };
  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="span-2">
        Tên sản phẩm
        <input
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </label>
      <label>
        Mã SKU
        <input
          required
          value={values.sku}
          onChange={(e) => set("sku", e.target.value)}
        />
      </label>
      <label>
        Mã linh kiện
        <input
          value={values.partNumber}
          onChange={(e) => set("partNumber", e.target.value)}
        />
      </label>
      <label>
        Slug
        <input
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
          placeholder="Tự tạo từ tên nếu để trống"
        />
      </label>
      <label>
        Danh mục
        <select
          required
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
        >
          {categories.map((c) => (
            <option value={c._id} key={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Thương hiệu
        <select
          value={values.brand}
          onChange={(e) => set("brand", e.target.value)}
        >
          <option value="">Không chọn</option>
          {brands.map((b) => (
            <option value={b._id} key={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Giá (VND)
        <input
          required
          type="number"
          min="0"
          value={values.price}
          onChange={(e) => set("price", e.target.value)}
        />
      </label>
      <label>
        Giá khuyến mãi
        <input
          type="number"
          min="0"
          value={values.salePrice}
          onChange={(e) => set("salePrice", e.target.value)}
        />
      </label>
      <label>
        Tồn kho
        <input
          required
          type="number"
          min="0"
          value={values.stock}
          onChange={(e) => set("stock", e.target.value)}
        />
      </label>
      <label>
        Số lượng đặt tối thiểu
        <input
          type="number"
          min="1"
          value={values.minOrderQty}
          onChange={(e) => set("minOrderQty", e.target.value)}
        />
      </label>
      <label>
        Đơn vị
        <input
          value={values.unit}
          onChange={(e) => set("unit", e.target.value)}
        />
      </label>
      <label className="span-2">
        Mô tả
        <textarea
          rows="3"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      <label>
        Tags, phân cách bằng dấu phẩy
        <input
          value={values.tags}
          onChange={(e) => set("tags", e.target.value)}
        />
      </label>
      <label>
        URL datasheet
        <input
          value={values.datasheetUrl}
          onChange={(e) => set("datasheetUrl", e.target.value)}
        />
      </label>
      <label className="span-2">
        Ảnh, mỗi URL một dòng
        <textarea
          rows="2"
          value={values.images}
          onChange={(e) => set("images", e.target.value)}
        />
      </label>
      <section
        className="span-2 product-field-list"
        aria-labelledby="product-specs-heading"
      >
        <div className="product-field-list-heading">
          <div>
            <h3 id="product-specs-heading">Thông số kỹ thuật</h3>
            <p>Nhập tên thông số và giá trị tương ứng.</p>
          </div>
          <button
            type="button"
            className="button secondary small-button"
            onClick={() => addRow("specs", { key: "", value: "" })}
          >
            Thêm thông số
          </button>
        </div>
        {values.specs.map((spec, index) => (
          <div className="product-field-row" key={`spec-${index}`}>
            <label>
              Tên thông số
              <input
                required
                value={spec.key}
                onChange={(e) => setRow("specs", index, "key", e.target.value)}
                placeholder="Ví dụ: Điện áp"
              />
            </label>
            <label>
              Giá trị
              <input
                required
                value={spec.value}
                onChange={(e) =>
                  setRow("specs", index, "value", e.target.value)
                }
                placeholder="Ví dụ: 5V"
              />
            </label>
            <button
              type="button"
              className="button secondary small-button remove-field-button"
              onClick={() => removeRow("specs", index)}
              aria-label={`Xóa thông số ${index + 1}`}
            >
              Xóa
            </button>
          </div>
        ))}
        {!values.specs.length && (
          <p className="empty-product-fields">Chưa có thông số kỹ thuật.</p>
        )}
      </section>
      <section
        className="span-2 product-field-list"
        aria-labelledby="product-tiers-heading"
      >
        <div className="product-field-list-heading">
          <div>
            <h3 id="product-tiers-heading">Bậc giá</h3>
            <p>
              Thiết lập giá áp dụng theo số lượng mua. Số lượng tối thiểu từ 2.
            </p>
          </div>
          <button
            type="button"
            className="button secondary small-button"
            onClick={() => addRow("priceTiers", { minQty: "", price: "" })}
          >
            Thêm bậc giá
          </button>
        </div>
        {values.priceTiers.map((tier, index) => (
          <div className="product-field-row" key={`tier-${index}`}>
            <label>
              Từ số lượng
              <input
                required
                type="number"
                min="2"
                step="1"
                value={tier.minQty}
                onChange={(e) =>
                  setRow("priceTiers", index, "minQty", e.target.value)
                }
                placeholder="Ví dụ: 10"
              />
            </label>
            <label>
              Đơn giá (VND)
              <input
                required
                type="number"
                min="0"
                step="1"
                value={tier.price}
                onChange={(e) =>
                  setRow("priceTiers", index, "price", e.target.value)
                }
                placeholder="Ví dụ: 45000"
              />
            </label>
            <button
              type="button"
              className="button secondary small-button remove-field-button"
              onClick={() => removeRow("priceTiers", index)}
              aria-label={`Xóa bậc giá ${index + 1}`}
            >
              Xóa
            </button>
          </div>
        ))}
        {!values.priceTiers.length && (
          <p className="empty-product-fields">
            Chưa có bậc giá. Sản phẩm sẽ dùng giá bán thông thường.
          </p>
        )}
      </section>
      <div className="span-2 check-row">
        <label>
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />{" "}
          Đang bán
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
          />{" "}
          Sản phẩm nổi bật
        </label>
      </div>
      <div className="span-2 form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Hủy
        </button>
        <button className="button primary">
          {item ? "Lưu thay đổi" : "Tạo sản phẩm"}
        </button>
      </div>
    </form>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("electro-user") || "null");
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState("shop");
  const [adminTab, setAdminTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0, totalItems: 0 });
  const [orders, setOrders] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [paidOrderCount, setPaidOrderCount] = useState(0);
  const [paidOrders, setPaidOrders] = useState([]);
  const [paidOrdersPage, setPaidOrdersPage] = useState(1);
  const [paidOrdersTotalPages, setPaidOrdersTotalPages] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    brand: "",
    minPrice: "",
    maxPrice: "",
    sort: "newest",
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [checkoutAddress, setCheckoutAddress] = useState(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [entityModal, setEntityModal] = useState(null);
  const [adminSearch, setAdminSearch] = useState("");

  const message = (text, type = "success") => {
    setNotice({ message: text, type });
    window.clearTimeout(window.noticeTimer);
    window.noticeTimer = window.setTimeout(() => setNotice(null), 4200);
  };
  const act = async (operation, successText, after) => {
    try {
      const result = await operation();
      if (successText) message(successText);
      if (after) await after(result);
      return result;
    } catch (error) {
      message(error.message, "error");
      return null;
    }
  };
  const refreshCart = useCallback(async () => {
    if (!localStorage.getItem("electro-token"))
      return setCart({ items: [], total: 0, totalItems: 0 });
    const result = await api("/cart");
    setCart(result.data);
  }, []);
  const refreshOrders = useCallback(async () => {
    if (user?.role === "admin") {
      const [result, summary] = await Promise.all([
        api("/orders?limit=100"),
        api("/orders/summary"),
      ]);
      setOrders(result.data || []);
      setRevenue(summary.data?.revenue || 0);
      setPaidOrderCount(summary.data?.paidOrderCount || 0);
      return;
    }
    const result = await api("/orders/my?limit=100");
    setOrders(result.data || []);
  }, [user?.role]);
  const refreshPaidOrders = useCallback(async () => {
    const result = await api(
      `/orders?paymentStatus=paid&page=${paidOrdersPage}&limit=10`,
    );
    setPaidOrders(result.data || []);
    setPaidOrdersTotalPages(result.totalPages || 1);
  }, [paidOrdersPage]);
  const refreshProducts = useCallback(async () => {
    const params = new URLSearchParams({
      limit: user?.role === "admin" ? "100" : "12",
      page: String(productPage),
      sort: "newest",
    });
    const endpoint = user?.role === "admin" ? "/products/admin" : "/products";
    if (user?.role !== "admin") {
      if (query.trim()) params.set("q", query.trim());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    } else if (adminSearch.trim()) params.set("q", adminSearch.trim());
    const result = await api(`${endpoint}?${params}`);
    setProducts(result.data || []);
    setProductTotalPages(result.totalPages || 1);
  }, [adminSearch, filters, productPage, query, user?.role]);
  const refreshCatalog = useCallback(async () => {
    const [categoryResult, brandResult] = await Promise.all([
      api("/categories"),
      api("/brands"),
    ]);
    setCategories(categoryResult.data || []);
    setBrands(brandResult.data || []);
  }, []);
  const refreshUsers = useCallback(async () => {
    const result = await api("/users?limit=100");
    setUsers(result.data || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshProducts(), refreshCatalog()])
      .catch((error) => message(error.message, "error"))
      .finally(() => setLoading(false));
  }, [refreshCatalog, refreshProducts]);

  useEffect(() => {
    if (!localStorage.getItem("electro-token")) return;
    api("/auth/me")
      .then((result) => {
        setUser(result.data);
        localStorage.setItem("electro-user", JSON.stringify(result.data));
      })
      .catch(() => {
        localStorage.removeItem("electro-token");
        localStorage.removeItem("electro-user");
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setCart({ items: [], total: 0, totalItems: 0 });
      setOrders([]);
      return;
    }
    Promise.all([refreshCart(), refreshOrders()]).catch((error) =>
      message(error.message, "error"),
    );
  }, [refreshCart, refreshOrders, user]);

  useEffect(() => {
    if (page !== "admin" || user?.role !== "admin") return;
    refreshProducts().catch((error) => message(error.message, "error"));
    if (adminTab === "categories" || adminTab === "brands")
      refreshCatalog().catch((error) => message(error.message, "error"));
    if (adminTab === "orders" || adminTab === "revenue")
      refreshOrders().catch((error) => message(error.message, "error"));
    if (adminTab === "revenue")
      refreshPaidOrders().catch((error) => message(error.message, "error"));
    if (adminTab === "users" || adminTab === "overview")
      refreshUsers().catch((error) => message(error.message, "error"));
  }, [
    adminTab,
    page,
    refreshCatalog,
    refreshOrders,
    refreshPaidOrders,
    refreshProducts,
    refreshUsers,
    user?.role,
  ]);

  useEffect(() => {
    if (!selectedProduct) return;
    api(`/products/${selectedProduct._id}/reviews`)
      .then((result) => setReviews(result.data || []))
      .catch((error) => message(error.message, "error"));
  }, [selectedProduct]);

  useEffect(() => {
    setProductPage(1);
  }, [filters, query]);

  const requireLogin = (nextPage) => {
    if (!user) {
      setSelectedProduct(null);
      setSelectedOrder(null);
      setPage("auth");
      message("Đăng nhập để tiếp tục.", "info");
      return false;
    }
    if (nextPage) setPage(nextPage);
    return true;
  };
  const handleAuth = async (event) => {
    event.preventDefault();
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
    const result = await act(() =>
      api(endpoint, { method: "POST", body: authForm }),
    );
    if (!result) return;
    localStorage.setItem("electro-token", result.data.token);
    localStorage.setItem("electro-user", JSON.stringify(result.data.user));
    setUser(result.data.user);
    setPage("shop");
    setAuthForm({ name: "", email: "", password: "", phone: "" });
    message(
      authMode === "login"
        ? "Đăng nhập thành công."
        : "Tạo tài khoản thành công.",
    );
  };
  const logout = () => {
    localStorage.removeItem("electro-token");
    localStorage.removeItem("electro-user");
    setUser(null);
    setPage("shop");
    message("Bạn đã đăng xuất.");
  };
  const addToCart = async (product) => {
    if (!requireLogin()) return;
    if (product.stock < 1)
      return message("Sản phẩm hiện đã hết hàng.", "error");
    const result = await act(
      () =>
        api("/cart/items", {
          method: "POST",
          body: { productId: product._id, quantity: product.minOrderQty || 1 },
        }),
      "Đã thêm sản phẩm vào giỏ.",
    );
    if (result) setCart(result.data);
  };
  const updateCartItem = async (productId, quantity) => {
    const result = await act(
      () =>
        api(`/cart/items/${productId}`, {
          method: "PUT",
          body: { quantity: Number(quantity) },
        }),
      "Đã cập nhật giỏ hàng.",
    );
    if (result) setCart(result.data);
  };
  const removeCartItem = async (productId) => {
    const result = await act(
      () => api(`/cart/items/${productId}`, { method: "DELETE" }),
      "Đã xóa sản phẩm khỏi giỏ.",
    );
    if (result) setCart(result.data);
  };
  const submitCheckout = async (event) => {
    event.preventDefault();
    const result = await act(
      () =>
        api("/orders", {
          method: "POST",
          body: {
            shippingAddress: checkoutAddress,
            paymentMethod,
            note: checkoutNote,
          },
        }),
      "Đặt hàng thành công.",
    );
    if (!result) return;
    setCart({ items: [], total: 0, totalItems: 0 });
    setCheckoutNote("");
    await refreshOrders().catch((error) => message(error.message, "error"));
    setPage("orders");
  };
  const cancelOrder = async (orderId) => {
    if (!window.confirm("Bạn muốn hủy đơn hàng này?")) return;
    const result = await act(
      () => api(`/orders/${orderId}/cancel`, { method: "PATCH" }),
      "Đã hủy đơn hàng.",
    );
    if (result) {
      setOrders((current) =>
        current.map((order) => (order._id === orderId ? result.data : order)),
      );
      refreshProducts().catch((error) => message(error.message, "error"));
    }
  };
  const showOrderDetails = async (orderId) => {
    const result = await act(() => api(`/orders/${orderId}`));
    if (result) setSelectedOrder(result.data);
  };
  const showUserDetails = async (userId) => {
    const result = await act(() => api(`/users/${userId}`));
    if (result) setSelectedUser(result.data);
  };
  const submitReview = async (event) => {
    event.preventDefault();
    if (!requireLogin()) return;
    const result = await act(
      () =>
        api(`/products/${selectedProduct._id}/reviews`, {
          method: "POST",
          body: reviewForm,
        }),
      "Đã gửi đánh giá.",
    );
    if (result) {
      setReviewForm({ rating: 5, comment: "" });
      const updated = await api(`/products/${selectedProduct._id}`).catch(
        () => null,
      );
      if (updated) setSelectedProduct(updated.data);
      const list = await api(`/products/${selectedProduct._id}/reviews`).catch(
        () => null,
      );
      if (list) setReviews(list.data);
      refreshProducts().catch(() => {});
    }
  };
  const removeReview = async (review) => {
    if (!window.confirm("Xóa đánh giá này?")) return;
    const result = await act(
      () =>
        api(`/products/${selectedProduct._id}/reviews/${review._id}`, {
          method: "DELETE",
        }),
      "Đã xóa đánh giá.",
    );
    if (result) {
      setReviews((current) =>
        current.filter((entry) => entry._id !== review._id),
      );
      const updated = await api(`/products/${selectedProduct._id}`).catch(
        () => null,
      );
      if (updated) setSelectedProduct(updated.data);
      refreshProducts().catch(() => {});
    }
  };

  const filteredOrders = useMemo(() => {
    const normalized = adminSearch.trim().toLowerCase();
    return orders.filter(
      (order) =>
        !normalized ||
        order.orderCode?.toLowerCase().includes(normalized) ||
        order.user?.name?.toLowerCase().includes(normalized) ||
        order.user?.email?.toLowerCase().includes(normalized),
    );
  }, [adminSearch, orders]);

  const saveProduct = async (form, existing) => {
    const result = await act(
      () =>
        api(existing ? `/products/${existing._id}` : "/products", {
          method: existing ? "PUT" : "POST",
          body: form,
        }),
      existing ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm.",
    );
    if (result) {
      setEntityModal(null);
      await refreshProducts();
    }
  };
  const saveCategory = async (form, existing) => {
    const result = await act(
      () =>
        api(existing ? `/categories/${existing._id}` : "/categories", {
          method: existing ? "PUT" : "POST",
          body: form,
        }),
      existing ? "Đã cập nhật danh mục." : "Đã tạo danh mục.",
    );
    if (result) {
      setEntityModal(null);
      await refreshCatalog();
    }
  };
  const saveBrand = async (form, existing) => {
    const result = await act(
      () =>
        api(existing ? `/brands/${existing._id}` : "/brands", {
          method: existing ? "PUT" : "POST",
          body: form,
        }),
      existing ? "Đã cập nhật thương hiệu." : "Đã tạo thương hiệu.",
    );
    if (result) {
      setEntityModal(null);
      await refreshCatalog();
    }
  };
  const deleteEntity = async (type, item) => {
    if (!window.confirm(`Xóa ${item.name || item.orderCode || "mục này"}?`))
      return;
    const route =
      type === "product"
        ? "products"
        : type === "category"
          ? "categories"
          : "brands";
    const result = await act(
      () => api(`/${route}/${item._id}`, { method: "DELETE" }),
      "Đã xóa.",
    );
    if (result) {
      if (type === "product") await refreshProducts();
      else await refreshCatalog();
    }
  };
  const updateOrder = async (order, field, value) => {
    const result = await act(
      () =>
        api(
          `/orders/${order._id}/${field === "status" ? "status" : "payment"}`,
          {
            method: "PATCH",
            body:
              field === "status" ? { status: value } : { paymentStatus: value },
          },
        ),
      "Đã cập nhật đơn hàng.",
    );
    if (result) {
      setOrders((current) =>
        current.map((item) => (item._id === order._id ? result.data : item)),
      );
      refreshOrders().catch((error) => message(error.message, "error"));
    }
  };
  const updateUser = async (person, field, value) => {
    const result = await act(
      () =>
        api(`/users/${person._id}`, {
          method: "PATCH",
          body: { [field]: value },
        }),
      "Đã cập nhật tài khoản.",
    );
    if (result)
      setUsers((current) =>
        current.map((item) => (item._id === person._id ? result.data : item)),
      );
  };
  const nav = (nextPage) => {
    if (
      ["cart", "checkout", "orders", "account"].includes(nextPage) &&
      !requireLogin()
    )
      return;
    setPage(nextPage);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand-lockup"
          onClick={() => setPage("shop")}
          aria-label="ElectroShop trang chủ"
        >
          <span className="brand-symbol">
            <Icon name="bolt" />
          </span>
          <span>
            ELECTRO<span className="accent">SHOP</span>
            <small>COMPONENTS FOR MAKERS</small>
          </span>
        </button>
        <div className="header-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setPage("shop")}
            placeholder="Tìm IC, module, cảm biến..."
          />
        </div>
        <nav className="header-actions">
          <button
            className={`nav-link ${page === "shop" ? "active" : ""}`}
            onClick={() => setPage("shop")}
          >
            Cửa hàng
          </button>
          {user?.role === "admin" && (
            <button
              className={`nav-link ${page === "admin" ? "active" : ""}`}
              onClick={() => {
                setPage("admin");
                setAdminTab("overview");
              }}
            >
              Quản trị
            </button>
          )}
          <button
            className="header-icon"
            onClick={() => nav("cart")}
            aria-label="Giỏ hàng"
          >
            <Icon name="cart" />
            <span>Giỏ hàng</span>
            {cart.totalItems > 0 && <b>{cart.totalItems}</b>}
          </button>
          {user ? (
            <div className="user-menu">
              <button className="header-icon" onClick={() => nav("account")}>
                <span className="avatar">
                  {(user.name || "U").slice(0, 1).toUpperCase()}
                </span>
                <span>{user.name?.split(" ")[0]}</span>
              </button>
              <button
                className="logout-button"
                onClick={logout}
                title="Đăng xuất"
              >
                <Icon name="logout" />
              </button>
            </div>
          ) : (
            <button
              className="button primary small-button"
              onClick={() => {
                setAuthMode("login");
                setPage("auth");
              }}
            >
              Đăng nhập <Icon name="arrow" />
            </button>
          )}
        </nav>
      </header>

      <main>
        {page === "shop" && (
          <div className="store-page">
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <i /> ELECTRONICS COMPONENTS STORE
                </span>
                <h1>
                  Biến ý tưởng
                  <br />
                  thành <span>mạch thực.</span>
                </h1>
                <p>
                  Linh kiện chất lượng cho maker, kỹ sư và những người yêu sáng
                  tạo.
                </p>
                <button
                  className="button primary"
                  onClick={() =>
                    document
                      .getElementById("catalog")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Khám phá sản phẩm <Icon name="arrow" />
                </button>
                <div className="hero-stats">
                  <div>
                    <b>100+</b>
                    <span>Linh kiện</span>
                  </div>
                  <div>
                    <b>24/7</b>
                    <span>Đồng hành dự án</span>
                  </div>
                  <div>
                    <b>100%</b>
                    <span>Chính hãng</span>
                  </div>
                </div>
              </div>
              <div className="hero-art">
                <div className="circuit-ring ring-one" />
                <div className="circuit-ring ring-two" />
                <div className="chip-illustration">
                  <div className="chip-top">
                    ESP32<span>·</span> DEV KIT
                  </div>
                  <div className="chip-core">
                    <Icon name="bolt" />
                  </div>
                  <div className="chip-pins">
                    <span>3V3</span>
                    <span>GND</span>
                    <span>TX</span>
                    <span>RX</span>
                  </div>
                </div>
                <div className="floating-chip chip-a">
                  NE555 <b>555</b>
                </div>
                <div className="floating-chip chip-b">
                  ◉ SENSOR <b>DHT22</b>
                </div>
                <div className="hero-grid" />
              </div>
            </section>
            <div className="trust-row">
              <span>
                <i /> Linh kiện được kiểm tra
              </span>
              <span>
                <i /> Giá tốt cho dự án
              </span>
              <span>
                <i /> Hỗ trợ sau bán hàng
              </span>
              <span className="trust-note">
                MÃ GIẢM GIÁ: <b>MAKER10</b>
              </span>
            </div>

            <section className="catalog-section" id="catalog">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">DANH MỤC SẢN PHẨM</span>
                  <h2>
                    Linh kiện cho mọi <span>dự án.</span>
                  </h2>
                </div>
                <div className="catalog-count">
                  {products.length} sản phẩm <Icon name="arrow" />
                </div>
              </div>
              <div className="category-pills">
                <button
                  className={!filters.category ? "selected" : ""}
                  onClick={() => setFilters((f) => ({ ...f, category: "" }))}
                >
                  Tất cả
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    className={
                      filters.category === category.slug ? "selected" : ""
                    }
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        category:
                          f.category === category.slug ? "" : category.slug,
                      }))
                    }
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="filter-toolbar">
                <span>
                  {query ? (
                    <>
                      Kết quả cho <b>“{query}”</b>
                    </>
                  ) : (
                    "Linh kiện được chọn lọc"
                  )}
                </span>
                <div className="filter-controls">
                  <select
                    aria-label="Lọc thương hiệu"
                    value={filters.brand}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, brand: e.target.value }))
                    }
                  >
                    <option value="">Tất cả thương hiệu</option>
                    {brands.map((brand) => (
                      <option value={brand.slug} key={brand._id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Sắp xếp"
                    value={filters.sort}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, sort: e.target.value }))
                    }
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="popular">Bán chạy</option>
                    <option value="rating">Đánh giá cao</option>
                    <option value="price_asc">Giá tăng dần</option>
                    <option value="price_desc">Giá giảm dần</option>
                  </select>
                </div>
              </div>
              <div className="price-filter">
                <span>Lọc giá:</span>
                <input
                  aria-label="Giá thấp nhất"
                  type="number"
                  placeholder="Từ"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minPrice: e.target.value }))
                  }
                />
                <span>—</span>
                <input
                  aria-label="Giá cao nhất"
                  type="number"
                  placeholder="Đến"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={filters.inStock === "true"}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        inStock: e.target.checked ? "true" : "",
                      }))
                    }
                  />{" "}
                  Còn hàng
                </label>
              </div>
              {loading ? (
                <div className="empty-state">Đang tải sản phẩm...</div>
              ) : products.length ? (
                <>
                  <div className="product-grid">
                    {products.map((product) => (
                      <ProductTile
                        key={product._id}
                        product={product}
                        onOpen={setSelectedProduct}
                        onAdd={addToCart}
                      />
                    ))}
                  </div>
                  {productTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        className="button secondary"
                        disabled={productPage <= 1}
                        onClick={() => setProductPage((current) => current - 1)}
                      >
                        ← Trước
                      </button>
                      <span>
                        Trang {productPage} / {productTotalPages}
                      </span>
                      <button
                        className="button secondary"
                        disabled={productPage >= productTotalPages}
                        onClick={() => setProductPage((current) => current + 1)}
                      >
                        Tiếp →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  Không tìm thấy sản phẩm phù hợp.
                </div>
              )}
            </section>
            <section className="bottom-cta">
              <div>
                <span className="eyebrow">BẠN ĐANG LÀM DỰ ÁN?</span>
                <h2>Chúng tôi có linh kiện bạn cần.</h2>
                <p>Khám phá giá sỉ theo số lượng trên từng sản phẩm.</p>
              </div>
              <button
                className="button primary"
                onClick={() =>
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Xem cửa hàng <Icon name="arrow" />
              </button>
            </section>
          </div>
        )}

        {page === "auth" && (
          <section className="auth-page">
            <div className="auth-art">
              <span className="eyebrow">
                <i /> MAKERS START HERE
              </span>
              <h1>
                Chào mừng
                <br />
                đến với <span>ElectroShop.</span>
              </h1>
              <p>Không gian linh kiện cho những ý tưởng lớn.</p>
              <div className="auth-circuit">
                <Icon name="bolt" />
              </div>
            </div>
            <form className="auth-card" onSubmit={handleAuth}>
              <span className="eyebrow">
                {authMode === "login"
                  ? "RẤT VUI ĐƯỢC GẶP LẠI"
                  : "THAM GIA CỘNG ĐỒNG MAKER"}
              </span>
              <h2>{authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h2>
              <p>
                {authMode === "login"
                  ? "Đăng nhập để quản lý giỏ hàng và đơn hàng."
                  : "Tạo tài khoản để bắt đầu mua sắm."}
              </p>
              {authMode === "register" && (
                <label>
                  Họ và tên
                  <input
                    required
                    value={authForm.name}
                    onChange={(e) =>
                      setAuthForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Nguyễn Văn An"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                />
              </label>
              {authMode === "register" && (
                <label>
                  Số điện thoại
                  <input
                    value={authForm.phone}
                    onChange={(e) =>
                      setAuthForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </label>
              )}
              <label>
                Mật khẩu
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </label>
              <button className="button primary full-button">
                {authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}{" "}
                <Icon name="arrow" />
              </button>
              <div className="auth-switch">
                {authMode === "login"
                  ? "Chưa có tài khoản?"
                  : "Đã có tài khoản?"}{" "}
                <button
                  type="button"
                  onClick={() =>
                    setAuthMode(authMode === "login" ? "register" : "login")
                  }
                >
                  {authMode === "login" ? "Đăng ký" : "Đăng nhập"}
                </button>
              </div>
            </form>
          </section>
        )}

        {page === "cart" && (
          <section className="content-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">SHOPPING CART</span>
                <h1>
                  Giỏ hàng <span>của bạn.</span>
                </h1>
              </div>
              <button
                className="button secondary"
                onClick={() => setPage("shop")}
              >
                Tiếp tục mua hàng
              </button>
            </div>
            {!cart.items?.length ? (
              <div className="empty-panel">
                <Icon name="cart" />
                <h2>Giỏ hàng đang trống</h2>
                <p>Thêm linh kiện bạn cần cho dự án.</p>
                <button
                  className="button primary"
                  onClick={() => setPage("shop")}
                >
                  Khám phá cửa hàng <Icon name="arrow" />
                </button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-list">
                  {cart.items.map((item) => (
                    <div className="cart-row" key={item.product._id}>
                      <div className="mini-product">
                        <div className="mini-product-image">
                          {item.product.image ? (
                            <img src={item.product.image} alt="" />
                          ) : (
                            <Icon name="bolt" />
                          )}
                        </div>
                        <div>
                          <b>{item.product.name}</b>
                          <small>{item.product.sku}</small>
                          <small>{money(item.unitPrice)} / sản phẩm</small>
                        </div>
                      </div>
                      <div className="quantity-control">
                        <button
                          aria-label="Giảm số lượng"
                          onClick={() =>
                            item.quantity > (item.product.minOrderQty || 1) &&
                            updateCartItem(item.product._id, item.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          aria-label="Tăng số lượng"
                          onClick={() =>
                            updateCartItem(item.product._id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <b className="line-total">{money(item.lineTotal)}</b>
                      <button
                        className="text-button danger-text"
                        onClick={() => removeCartItem(item.product._id)}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
                <aside className="summary-card">
                  <span className="eyebrow">TÓM TẮT ĐƠN HÀNG</span>
                  <h2>{cart.totalItems} sản phẩm</h2>
                  <div className="summary-line">
                    <span>Tạm tính</span>
                    <b>{money(cart.total)}</b>
                  </div>
                  <div className="summary-line">
                    <span>Phí vận chuyển</span>
                    <span>Tính khi đặt hàng</span>
                  </div>
                  <hr />
                  <div className="summary-line total">
                    <span>Tổng cộng</span>
                    <b>{money(cart.total)}</b>
                  </div>
                  <p>Phí giao hàng miễn phí cho đơn từ 500.000₫.</p>
                  <button
                    className="button primary full-button"
                    onClick={() => {
                      if (requireLogin("checkout"))
                        setCheckoutAddress((a) => ({
                          ...a,
                          fullName: a.fullName || user?.name || "",
                          phone: a.phone || user?.phone || "",
                        }));
                    }}
                  >
                    Tiến hành thanh toán <Icon name="arrow" />
                  </button>
                </aside>
              </div>
            )}
          </section>
        )}

        {page === "checkout" && (
          <section className="content-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">SECURE CHECKOUT</span>
                <h1>
                  Thông tin <span>giao hàng.</span>
                </h1>
              </div>
              <button className="text-button" onClick={() => setPage("cart")}>
                ← Quay lại giỏ hàng
              </button>
            </div>
            <div className="checkout-layout">
              <form className="panel checkout-form" onSubmit={submitCheckout}>
                <h2>Địa chỉ nhận hàng</h2>
                <div className="form-grid">
                  <label>
                    Người nhận
                    <input
                      required
                      value={checkoutAddress.fullName}
                      onChange={(e) =>
                        setCheckoutAddress((a) => ({
                          ...a,
                          fullName: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Số điện thoại
                    <input
                      required
                      value={checkoutAddress.phone}
                      onChange={(e) =>
                        setCheckoutAddress((a) => ({
                          ...a,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Tỉnh / Thành phố
                    <input
                      required
                      value={checkoutAddress.province}
                      onChange={(e) =>
                        setCheckoutAddress((a) => ({
                          ...a,
                          province: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Quận / Huyện
                    <input
                      required
                      value={checkoutAddress.district}
                      onChange={(e) =>
                        setCheckoutAddress((a) => ({
                          ...a,
                          district: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Phường / Xã
                    <input
                      required
                      value={checkoutAddress.ward}
                      onChange={(e) =>
                        setCheckoutAddress((a) => ({
                          ...a,
                          ward: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="span-2">
                    Địa chỉ chi tiết
                    <input
                      required
                      value={checkoutAddress.street}
                      onChange={(e) =>
                        setCheckoutAddress((a) => ({
                          ...a,
                          street: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <h2 className="form-section-title">Phương thức thanh toán</h2>
                <div className="payment-options">
                  {[
                    ["cod", "Thanh toán khi nhận hàng"],
                    ["bank_transfer", "Chuyển khoản ngân hàng"],
                    ["momo", "Ví MoMo"],
                    ["vnpay", "VNPay"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className={
                        paymentMethod === value
                          ? "payment-option chosen"
                          : "payment-option"
                      }
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={paymentMethod === value}
                        onChange={() => setPaymentMethod(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <label>
                  Ghi chú đơn hàng
                  <textarea
                    rows="3"
                    value={checkoutNote}
                    onChange={(e) => setCheckoutNote(e.target.value)}
                    placeholder="Lưu ý khi giao hàng..."
                  />
                </label>
                <button className="button primary full-button">
                  Xác nhận đặt hàng <Icon name="arrow" />
                </button>
              </form>
              <aside className="summary-card">
                <span className="eyebrow">ĐƠN HÀNG CỦA BẠN</span>
                {cart.items.map((item) => (
                  <div className="summary-line" key={item.product._id}>
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <b>{money(item.lineTotal)}</b>
                  </div>
                ))}
                <hr />
                <div className="summary-line">
                  <span>Tạm tính</span>
                  <b>{money(cart.total)}</b>
                </div>
                <div className="summary-line">
                  <span>Vận chuyển</span>
                  <b>{cart.total >= 500000 ? "Miễn phí" : money(30000)}</b>
                </div>
                <hr />
                <div className="summary-line total">
                  <span>Tổng thanh toán</span>
                  <b>
                    {money(cart.total + (cart.total >= 500000 ? 0 : 30000))}
                  </b>
                </div>
                <p>Giá và tồn kho sẽ được xác nhận từ máy chủ khi đặt đơn.</p>
              </aside>
            </div>
          </section>
        )}

        {page === "orders" && (
          <section className="content-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">ORDER HISTORY</span>
                <h1>
                  Đơn hàng <span>của bạn.</span>
                </h1>
              </div>
              <button
                className="button secondary"
                onClick={() => setPage("shop")}
              >
                Tiếp tục mua sắm
              </button>
            </div>
            {!orders.length ? (
              <div className="empty-panel">
                <Icon name="box" />
                <h2>Chưa có đơn hàng</h2>
                <p>Đơn hàng sau khi đặt sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="order-list">
                {orders.map((order) => (
                  <article className="order-card" key={order._id}>
                    <header>
                      <div>
                        <span className="eyebrow">{order.orderCode}</span>
                        <small>
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </small>
                      </div>
                      <span className={`status-badge ${order.status}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </header>
                    <div className="order-items">
                      {order.items.map((item, index) => (
                        <div key={`${item.product}-${index}`}>
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                          <b>{money(item.price * item.quantity)}</b>
                        </div>
                      ))}
                    </div>
                    <footer>
                      <div>
                        <small>
                          {order.paymentMethod} ·{" "}
                          {STATUS_LABELS[order.paymentStatus] ||
                            order.paymentStatus}
                        </small>
                        <strong>{money(order.totalPrice)}</strong>
                      </div>
                      <div className="order-actions">
                        <button
                          className="button secondary"
                          onClick={() => showOrderDetails(order._id)}
                        >
                          Chi tiết
                        </button>
                        {order.status === "pending" && (
                          <button
                            className="button secondary danger-button"
                            onClick={() => cancelOrder(order._id)}
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {page === "account" && user && (
          <section className="content-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">ACCOUNT SETTINGS</span>
                <h1>
                  Tài khoản <span>của bạn.</span>
                </h1>
              </div>
            </div>
            <AccountPanel
              user={user}
              onUpdated={(updated) => {
                setUser(updated);
                localStorage.setItem("electro-user", JSON.stringify(updated));
                message("Đã cập nhật thông tin.");
              }}
              onPasswordChanged={() => message("Đã đổi mật khẩu.")}
              onError={(error) => message(error, "error")}
              onOrders={() => setPage("orders")}
            />
          </section>
        )}

        {page === "admin" && user?.role === "admin" && (
          <section className="admin-page">
            <aside className="admin-sidebar">
              <span className="eyebrow">WORKSPACE</span>
              <h2>Quản trị</h2>
              {[
                ["overview", "Tổng quan"],
                ["products", "Sản phẩm"],
                ["categories", "Danh mục"],
                ["brands", "Thương hiệu"],
                ["orders", "Đơn hàng"],
                ["revenue", "Doanh thu"],
                ["users", "Người dùng"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={adminTab === value ? "active" : ""}
                  onClick={() => {
                    setAdminTab(value);
                    setAdminSearch("");
                  }}
                >
                  <Icon
                    name={
                      value === "overview"
                        ? "grid"
                        : value === "orders"
                          ? "box"
                          : value === "revenue"
                            ? "revenue"
                            : "bolt"
                    }
                  />
                  {label}
                </button>
              ))}
            </aside>
            <div className="admin-content">
              {adminTab === "overview" && (
                <>
                  <div className="page-title">
                    <div>
                      <span className="eyebrow">ADMIN DASHBOARD</span>
                      <h1>
                        Xin chào, <span>{user.name?.split(" ").at(-1)}.</span>
                      </h1>
                    </div>
                    <span className="live-indicator">
                      <i /> HỆ THỐNG ĐANG HOẠT ĐỘNG
                    </span>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span>Tổng sản phẩm</span>
                      <b>{products.length}</b>
                      <small>Đang được hiển thị</small>
                    </div>
                    <div className="stat-card">
                      <span>Đơn hàng</span>
                      <b>{orders.length}</b>
                      <small>Tất cả trạng thái</small>
                    </div>
                    <div className="stat-card">
                      <span>Người dùng</span>
                      <b>{users.length || "—"}</b>
                      <small>Đã đăng ký</small>
                    </div>
                    <div className="stat-card">
                      <span>Doanh thu</span>
                      <b>{money(revenue)}</b>
                      <small>Đơn đã thanh toán, trừ đơn hoàn tiền</small>
                    </div>
                  </div>
                  <div className="panel admin-welcome">
                    <span className="eyebrow">QUẢN LÝ CỬA HÀNG</span>
                    <h2>Vận hành ElectroShop.</h2>
                    <p>
                      Chọn mục bên trái để quản lý danh mục, hàng hóa, đơn đặt
                      và tài khoản người dùng.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => setAdminTab("products")}
                    >
                      Quản lý sản phẩm <Icon name="arrow" />
                    </button>
                  </div>
                </>
              )}
              {adminTab === "products" && (
                <>
                  <AdminHeading
                    title="Sản phẩm"
                    description="Tạo và cập nhật kho linh kiện."
                    action="Thêm sản phẩm"
                    onAction={() => setEntityModal({ type: "product" })}
                  />
                  <div className="admin-search">
                    <Icon name="search" />
                    <input
                      placeholder="Tìm sản phẩm, SKU..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>SKU</th>
                          <th>Danh mục</th>
                          <th>Giá</th>
                          <th>Tồn kho</th>
                          <th>Trạng thái</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product._id}>
                            <td>
                              <div className="table-product">
                                <div className="table-thumb">
                                  {imageOf(product) ? (
                                    <img src={imageOf(product)} alt="" />
                                  ) : (
                                    <Icon name="bolt" />
                                  )}
                                </div>
                                <b>{product.name}</b>
                              </div>
                            </td>
                            <td>{product.sku}</td>
                            <td>{product.category?.name}</td>
                            <td>{money(product.salePrice || product.price)}</td>
                            <td>{product.stock}</td>
                            <td>
                              <span
                                className={`status-badge ${product.isActive ? "delivered" : "cancelled"}`}
                              >
                                {product.isActive ? "Đang bán" : "Đã ẩn"}
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  onClick={() =>
                                    setEntityModal({
                                      type: "product",
                                      item: product,
                                    })
                                  }
                                >
                                  Sửa
                                </button>
                                <button
                                  className="danger-text"
                                  onClick={() =>
                                    deleteEntity("product", product)
                                  }
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {products.length === 0 && (
                      <div className="empty-state">Không có sản phẩm nào.</div>
                    )}
                  </div>
                </>
              )}
              {adminTab === "categories" && (
                <>
                  <AdminHeading
                    title="Danh mục"
                    description="Quản lý nhóm linh kiện trên cửa hàng."
                    action="Thêm danh mục"
                    onAction={() => setEntityModal({ type: "category" })}
                  />
                  <div className="entity-grid">
                    {categories.map((category) => (
                      <EntityCard
                        key={category._id}
                        title={category.name}
                        subtitle={category.slug}
                        extra={category.description}
                        onEdit={() =>
                          setEntityModal({ type: "category", item: category })
                        }
                        onDelete={() => deleteEntity("category", category)}
                      />
                    ))}
                  </div>
                </>
              )}
              {adminTab === "brands" && (
                <>
                  <AdminHeading
                    title="Thương hiệu"
                    description="Quản lý hãng sản xuất."
                    action="Thêm thương hiệu"
                    onAction={() => setEntityModal({ type: "brand" })}
                  />
                  <div className="entity-grid">
                    {brands.map((brand) => (
                      <EntityCard
                        key={brand._id}
                        title={brand.name}
                        subtitle={brand.country || brand.slug}
                        extra={brand.slug}
                        onEdit={() =>
                          setEntityModal({ type: "brand", item: brand })
                        }
                        onDelete={() => deleteEntity("brand", brand)}
                      />
                    ))}
                  </div>
                </>
              )}
              {adminTab === "orders" && (
                <>
                  <AdminHeading
                    title="Đơn hàng"
                    description="Theo dõi xử lý đơn và thanh toán."
                  />
                  <div className="admin-search">
                    <Icon name="search" />
                    <input
                      placeholder="Tìm mã đơn, khách hàng..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Khách hàng</th>
                          <th>Ngày đặt</th>
                          <th>Tổng tiền</th>
                          <th>Trạng thái</th>
                          <th>Thanh toán</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order._id}>
                            <td>
                              <b>{order.orderCode}</b>
                              <small className="table-sub">
                                {order.items?.length || 0} sản phẩm
                              </small>
                            </td>
                            <td>{order.user?.name || "Khách hàng"}</td>
                            <td>
                              {new Date(order.createdAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>
                            <td>{money(order.totalPrice)}</td>
                            <td>
                              <select
                                className="table-select"
                                value={order.status}
                                disabled={
                                  !ORDER_TRANSITIONS[order.status]?.length
                                }
                                onChange={(e) =>
                                  updateOrder(order, "status", e.target.value)
                                }
                              >
                                {[
                                  order.status,
                                  ...(ORDER_TRANSITIONS[order.status] || []),
                                ].map((state) => (
                                  <option key={state} value={state}>
                                    {STATUS_LABELS[state]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="table-select"
                                value={order.paymentStatus}
                                onChange={(e) =>
                                  updateOrder(
                                    order,
                                    "paymentStatus",
                                    e.target.value,
                                  )
                                }
                              >
                                {PAYMENT_STATES.map((state) => (
                                  <option key={state} value={state}>
                                    {STATUS_LABELS[state]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => showOrderDetails(order._id)}
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredOrders.length === 0 && (
                      <div className="empty-state">Không có đơn hàng.</div>
                    )}
                  </div>
                </>
              )}
              {adminTab === "revenue" && (
                <>
                  <AdminHeading
                    title="Doanh thu"
                    description="Tổng hợp doanh thu từ các đơn đã thanh toán."
                  />
                  <div className="stats-grid revenue-stats">
                    <div className="stat-card">
                      <span>Tổng doanh thu đã thu</span>
                      <b>{money(revenue)}</b>
                      <small>Không bao gồm đơn đã hoàn tiền</small>
                    </div>
                    <div className="stat-card">
                      <span>Đơn đã thanh toán</span>
                      <b>{paidOrderCount}</b>
                      <small>Tính trên toàn bộ đơn hàng</small>
                    </div>
                  </div>
                  <div className="panel admin-welcome">
                    <span className="eyebrow">THỐNG KÊ THANH TOÁN</span>
                    <h2>Doanh thu thực nhận</h2>
                    <p>
                      Chỉ các đơn có trạng thái thanh toán “Đã thanh toán” được
                      tính vào doanh thu. Đơn đã hoàn tiền sẽ tự động bị loại
                      khỏi tổng số.
                    </p>
                  </div>
                  <section className="paid-orders-section">
                    <div className="subsection-title">
                      <div>
                        <span className="eyebrow">CHI TIẾT THANH TOÁN</span>
                        <h3>Đơn hàng đã thanh toán</h3>
                      </div>
                      <span className="address-count">{paidOrderCount}</span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Mã đơn</th>
                            <th>Khách hàng</th>
                            <th>Ngày thanh toán</th>
                            <th>Phương thức</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {paidOrders.map((order) => (
                            <tr key={order._id}>
                              <td>
                                <b>{order.orderCode}</b>
                              </td>
                              <td>{order.user?.name || "Khách hàng"}</td>
                              <td>
                                {new Date(
                                  order.paidAt || order.createdAt,
                                ).toLocaleDateString("vi-VN")}
                              </td>
                              <td>{order.paymentMethod}</td>
                              <td>{money(order.totalPrice)}</td>
                              <td>
                                <span className="status-badge paid">
                                  Đã thanh toán
                                </span>
                              </td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => showOrderDetails(order._id)}
                                >
                                  Chi tiết
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {paidOrders.length === 0 && (
                        <div className="empty-state">
                          Chưa có đơn hàng nào đã thanh toán.
                        </div>
                      )}
                    </div>
                    {paidOrdersTotalPages > 1 && (
                      <div className="pagination">
                        <button
                          className="button secondary"
                          disabled={paidOrdersPage <= 1}
                          onClick={() =>
                            setPaidOrdersPage((current) => current - 1)
                          }
                        >
                          ← Trước
                        </button>
                        <span>
                          Trang {paidOrdersPage} / {paidOrdersTotalPages}
                        </span>
                        <button
                          className="button secondary"
                          disabled={paidOrdersPage >= paidOrdersTotalPages}
                          onClick={() =>
                            setPaidOrdersPage((current) => current + 1)
                          }
                        >
                          Tiếp →
                        </button>
                      </div>
                    )}
                  </section>
                </>
              )}
              {adminTab === "users" && (
                <>
                  <AdminHeading
                    title="Người dùng"
                    description="Quản lý quyền truy cập và trạng thái tài khoản."
                  />
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Người dùng</th>
                          <th>Email</th>
                          <th>Số điện thoại</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((person) => (
                          <tr key={person._id}>
                            <td>
                              <div className="table-user">
                                <span className="avatar">
                                  {person.name?.slice(0, 1)}
                                </span>
                                <b>{person.name}</b>
                              </div>
                            </td>
                            <td>{person.email}</td>
                            <td>{person.phone || "—"}</td>
                            <td>
                              <select
                                className="table-select"
                                value={person.role}
                                onChange={(e) =>
                                  updateUser(person, "role", e.target.value)
                                }
                                disabled={person._id === user._id}
                              >
                                <option value="customer">Khách hàng</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <button
                                className={`toggle ${person.isActive ? "on" : ""}`}
                                aria-label={
                                  person.isActive
                                    ? "Khóa tài khoản"
                                    : "Mở tài khoản"
                                }
                                onClick={() =>
                                  updateUser(
                                    person,
                                    "isActive",
                                    !person.isActive,
                                  )
                                }
                                disabled={person._id === user._id}
                              >
                                <span />
                              </button>{" "}
                              {person.isActive ? "Hoạt động" : "Đã khóa"}
                            </td>
                            <td>
                              <button
                                className="text-button user-detail-button"
                                onClick={() => showUserDetails(person._id)}
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {users.length === 0 && (
                      <div className="empty-state">
                        Chưa tải danh sách người dùng.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <button
          className="brand-lockup footer-brand"
          onClick={() => setPage("shop")}
        >
          <span className="brand-symbol">
            <Icon name="bolt" />
          </span>
          <span>
            ELECTRO<span className="accent">SHOP</span>
            <small>COMPONENTS FOR MAKERS</small>
          </span>
        </button>
        <span>Linh kiện tốt. Ý tưởng lớn. © 2026 ElectroShop</span>
        <a href="mailto:support@electroshop.local">Hỗ trợ kỹ thuật</a>
      </footer>
      <Notice notice={notice} clear={() => setNotice(null)} />

      {selectedProduct && (
        <Modal
          title="Chi tiết sản phẩm"
          close={() => setSelectedProduct(null)}
          wide
        >
          <div className="product-detail">
            <div className="detail-visual">
              {imageOf(selectedProduct) ? (
                <img
                  src={imageOf(selectedProduct)}
                  alt={selectedProduct.name}
                />
              ) : (
                <div className="product-placeholder">
                  <Icon name="bolt" />
                  <span>{selectedProduct.category?.name || "LINH KIỆN"}</span>
                </div>
              )}
            </div>
            <div className="detail-info">
              <span className="eyebrow">
                {selectedProduct.brand?.name || "ELECTROSHOP"} ·{" "}
                {selectedProduct.sku}
              </span>
              <h2>{selectedProduct.name}</h2>
              <div className="detail-rating">
                ★ {Number(selectedProduct.ratingAvg || 0).toFixed(1)}{" "}
                <span>({selectedProduct.ratingCount || 0} đánh giá)</span>
              </div>
              <strong className="detail-price">
                {money(selectedProduct.salePrice || selectedProduct.price)}
              </strong>
              {selectedProduct.salePrice > 0 && (
                <del>{money(selectedProduct.price)}</del>
              )}
              <p>
                {selectedProduct.description ||
                  "Sản phẩm linh kiện điện tử chất lượng."}
              </p>
              <div className="detail-stock">
                {selectedProduct.stock > 0
                  ? `Còn ${selectedProduct.stock} ${selectedProduct.unit || "cái"} trong kho`
                  : "Tạm hết hàng"}
              </div>
              {selectedProduct.priceTiers?.length > 0 && (
                <div className="tier-box">
                  <b>Giá ưu đãi theo số lượng</b>
                  {selectedProduct.priceTiers.map((tier) => (
                    <div key={tier.minQty}>
                      Từ {tier.minQty} sản phẩm <b>{money(tier.price)} / cái</b>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="button primary"
                disabled={!selectedProduct.stock}
                onClick={() => addToCart(selectedProduct)}
              >
                Thêm vào giỏ <Icon name="cart" />
              </button>
            </div>
          </div>
          {selectedProduct.specs?.length > 0 && (
            <div className="specs">
              <h3>Thông số kỹ thuật</h3>
              {selectedProduct.specs.map((spec) => (
                <div key={spec.key}>
                  <span>{spec.key}</span>
                  <b>{spec.value}</b>
                </div>
              ))}
            </div>
          )}
          {selectedProduct.datasheetUrl && (
            <a
              className="datasheet-link"
              href={selectedProduct.datasheetUrl}
              target="_blank"
              rel="noreferrer"
            >
              Mở datasheet ↗
            </a>
          )}
          <div className="reviews-section">
            <div className="subsection-title">
              <div>
                <span className="eyebrow">CỘNG ĐỒNG MAKER</span>
                <h3>Đánh giá sản phẩm</h3>
              </div>
              <span className="rating">
                ★ {Number(selectedProduct.ratingAvg || 0).toFixed(1)}
              </span>
            </div>
            {reviews.map((review) => (
              <div className="review-row" key={review._id}>
                <span className="avatar">
                  {review.user?.name?.slice(0, 1) || "U"}
                </span>
                <div>
                  <b>
                    {review.user?.name || "Người dùng"}{" "}
                    <span className="rating">{"★".repeat(review.rating)}</span>
                  </b>
                  <small>
                    {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                  </small>
                  <p>{review.comment || "Không có nhận xét."}</p>
                </div>
                {(review.user?._id === user?._id || user?.role === "admin") && (
                  <button
                    className="text-button danger-text"
                    onClick={() => removeReview(review)}
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
            {user?.role !== "admin" && (
              <form className="review-form" onSubmit={submitReview}>
                <label>
                  Đánh giá
                  <select
                    value={reviewForm.rating}
                    onChange={(e) =>
                      setReviewForm((f) => ({
                        ...f,
                        rating: Number(e.target.value),
                      }))
                    }
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} sao
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nhận xét
                  <textarea
                    rows="2"
                    value={reviewForm.comment}
                    onChange={(e) =>
                      setReviewForm((f) => ({ ...f, comment: e.target.value }))
                    }
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                  />
                </label>
                <button className="button secondary">Gửi đánh giá</button>
              </form>
            )}
          </div>
        </Modal>
      )}

      {selectedOrder && (
        <Modal
          title={`Đơn hàng ${selectedOrder.orderCode}`}
          close={() => setSelectedOrder(null)}
        >
          <div className="order-detail-modal">
            <span className={`status-badge ${selectedOrder.status}`}>
              {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
            </span>
            <div className="order-items">
              {selectedOrder.items.map((item, index) => (
                <div key={`${item.product}-${index}`}>
                  <span>
                    {item.name} ({item.sku}) × {item.quantity}
                  </span>
                  <b>{money(item.price * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="specs">
              <h3>Địa chỉ giao hàng</h3>
              <p>
                {selectedOrder.shippingAddress?.fullName} ·{" "}
                {selectedOrder.shippingAddress?.phone}
              </p>
              <p>
                {[
                  selectedOrder.shippingAddress?.street,
                  selectedOrder.shippingAddress?.ward,
                  selectedOrder.shippingAddress?.district,
                  selectedOrder.shippingAddress?.province,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div className="specs">
              <h3>Thanh toán</h3>
              <div>
                <span>Phương thức</span>
                <b>{selectedOrder.paymentMethod}</b>
              </div>
              <div>
                <span>Trạng thái</span>
                <b>
                  {STATUS_LABELS[selectedOrder.paymentStatus] ||
                    selectedOrder.paymentStatus}
                </b>
              </div>
              <div>
                <span>Phí vận chuyển</span>
                <b>{money(selectedOrder.shippingFee)}</b>
              </div>
              <div>
                <span>Giảm giá</span>
                <b>{money(selectedOrder.discount)}</b>
              </div>
              <div>
                <span>Tổng cộng</span>
                <b className="accent">{money(selectedOrder.totalPrice)}</b>
              </div>
              {selectedOrder.note && <p>Ghi chú: {selectedOrder.note}</p>}
            </div>
          </div>
        </Modal>
      )}

      {selectedUser && (
        <Modal title="Chi tiết người dùng" close={() => setSelectedUser(null)}>
          <div className="user-detail-modal">
            <div className="user-detail-heading">
              <span className="avatar user-detail-avatar">
                {selectedUser.name?.slice(0, 1).toUpperCase() || "U"}
              </span>
              <div>
                <h3>{selectedUser.name}</h3>
                <span>{selectedUser.email}</span>
              </div>
              <span
                className={`status-badge ${selectedUser.isActive ? "delivered" : "cancelled"}`}
              >
                {selectedUser.isActive ? "Hoạt động" : "Đã khóa"}
              </span>
            </div>
            <div className="user-detail-fields">
              <div>
                <span>Số điện thoại</span>
                <b>{selectedUser.phone || "Chưa cập nhật"}</b>
              </div>
              <div>
                <span>Vai trò</span>
                <b>
                  {selectedUser.role === "admin"
                    ? "Quản trị viên"
                    : "Khách hàng"}
                </b>
              </div>
              <div>
                <span>Ngày tạo tài khoản</span>
                <b>
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleString("vi-VN")
                    : "—"}
                </b>
              </div>
              <div>
                <span>Cập nhật lần cuối</span>
                <b>
                  {selectedUser.updatedAt
                    ? new Date(selectedUser.updatedAt).toLocaleString("vi-VN")
                    : "—"}
                </b>
              </div>
            </div>
            <div className="user-addresses">
              <div className="subsection-title">
                <div>
                  <span className="eyebrow">ADDRESS BOOK</span>
                  <h3>Địa chỉ đã lưu</h3>
                </div>
                <span className="address-count">
                  {selectedUser.addresses?.length || 0}
                </span>
              </div>
              {selectedUser.addresses?.length ? (
                selectedUser.addresses.map((address, index) => (
                  <article
                    className="user-address-card"
                    key={address._id || index}
                  >
                    <div className="user-address-title">
                      <b>{address.fullName}</b>
                      {address.isDefault && (
                        <span className="status-badge delivered">Mặc định</span>
                      )}
                    </div>
                    <p>{address.phone}</p>
                    <p>
                      {[
                        address.street,
                        address.ward,
                        address.district,
                        address.province,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </article>
                ))
              ) : (
                <p className="muted-copy">Người dùng chưa lưu địa chỉ nào.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {entityModal && (
        <Modal
          title={`${entityModal.item ? "Chỉnh sửa" : "Thêm"} ${entityModal.type === "product" ? "sản phẩm" : entityModal.type === "brand" ? "thương hiệu" : "danh mục"}`}
          close={() => setEntityModal(null)}
          wide
        >
          {entityModal.type === "product" ? (
            <AdminProductForm
              item={entityModal.item}
              categories={categories}
              brands={brands}
              onSubmit={(form) => saveProduct(form, entityModal.item)}
              onCancel={() => setEntityModal(null)}
            />
          ) : (
            <EntityForm
              key={`${entityModal.type}-${entityModal.item?._id || "new"}`}
              type={entityModal.type}
              item={entityModal.item}
              categories={categories}
              onSubmit={(form) =>
                entityModal.type === "category"
                  ? saveCategory(form, entityModal.item)
                  : saveBrand(form, entityModal.item)
              }
              onCancel={() => setEntityModal(null)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

function AdminHeading({ title, description, action, onAction }) {
  return (
    <div className="admin-heading">
      <div>
        <span className="eyebrow">QUẢN LÝ CỬA HÀNG</span>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action && (
        <button className="button primary" onClick={onAction}>
          <Icon name="plus" /> {action}
        </button>
      )}
    </div>
  );
}

function EntityCard({ title, subtitle, extra, onEdit, onDelete }) {
  return (
    <article className="entity-card">
      <span className="entity-symbol">
        <Icon name="grid" />
      </span>
      <h3>{title}</h3>
      <span className="entity-slug">{subtitle}</span>
      {extra && <p>{extra}</p>}
      <div className="entity-actions">
        <button onClick={onEdit}>Chỉnh sửa</button>
        <button className="danger-text" onClick={onDelete}>
          Xóa
        </button>
      </div>
    </article>
  );
}

function EntityForm({ type, item, categories, onSubmit, onCancel }) {
  const [values, setValues] = useState(
    type === "category"
      ? {
          name: item?.name || "",
          slug: item?.slug || "",
          description: item?.description || "",
          parent: item?.parent?._id || item?.parent || "",
          image: item?.image || "",
          isActive: item?.isActive !== false,
        }
      : {
          name: item?.name || "",
          slug: item?.slug || "",
          country: item?.country || "",
          logo: item?.logo || "",
        },
  );
  const update = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));
  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        const body =
          type === "category"
            ? { ...values, parent: values.parent || null }
            : values;
        onSubmit(body);
      }}
    >
      <label>
        Tên
        <input
          required
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </label>
      <label>
        Slug
        <input
          value={values.slug}
          onChange={(e) => update("slug", e.target.value)}
          placeholder="Để trống để tự tạo"
        />
      </label>
      {type === "category" ? (
        <>
          <label>
            Mô tả
            <textarea
              rows="3"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label>
            Danh mục cha
            <select
              value={values.parent}
              onChange={(e) => update("parent", e.target.value)}
            >
              <option value="">Không có (danh mục gốc)</option>
              {categories
                .filter((category) => category._id !== item?._id)
                .map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Ảnh đại diện URL
            <input
              value={values.image}
              onChange={(e) => update("image", e.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
            />{" "}
            Đang hoạt động
          </label>
        </>
      ) : (
        <>
          <label>
            Quốc gia
            <input
              value={values.country}
              onChange={(e) => update("country", e.target.value)}
            />
          </label>
          <label>
            Logo URL
            <input
              value={values.logo}
              onChange={(e) => update("logo", e.target.value)}
            />
          </label>
        </>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Hủy
        </button>
        <button className="button primary">
          {item ? "Lưu thay đổi" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}

function AccountPanel({
  user,
  onUpdated,
  onPasswordChanged,
  onError,
  onOrders,
}) {
  const [profile, setProfile] = useState({
    name: user.name || "",
    phone: user.phone || "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api("/auth/me", { method: "PUT", body: profile });
      onUpdated(result.data);
    } catch (error) {
      onError(error.message);
    } finally {
      setSaving(false);
    }
  };
  const savePassword = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/auth/password", { method: "PUT", body: password });
      setPassword({ currentPassword: "", newPassword: "" });
      onPasswordChanged();
    } catch (error) {
      onError(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="account-layout">
      <div className="panel account-panel">
        <div className="account-heading">
          <span className="avatar large-avatar">{user.name?.slice(0, 1)}</span>
          <div>
            <h2>{user.name}</h2>
            <span>{user.email}</span>
          </div>
          <button className="button secondary" onClick={onOrders}>
            Lịch sử đơn hàng
          </button>
        </div>
        <form className="stack-form" onSubmit={saveProfile}>
          <h3>Thông tin cá nhân</h3>
          <label>
            Họ và tên
            <input
              required
              value={profile.name}
              onChange={(e) =>
                setProfile((f) => ({ ...f, name: e.target.value }))
              }
            />
          </label>
          <label>
            Số điện thoại
            <input
              value={profile.phone}
              onChange={(e) =>
                setProfile((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </label>
          <button className="button primary" disabled={saving}>
            Lưu thông tin
          </button>
        </form>
      </div>
      <form className="panel stack-form" onSubmit={savePassword}>
        <span className="eyebrow">SECURITY</span>
        <h2>Đổi mật khẩu</h2>
        <label>
          Mật khẩu hiện tại
          <input
            required
            type="password"
            minLength="6"
            value={password.currentPassword}
            onChange={(e) =>
              setPassword((f) => ({ ...f, currentPassword: e.target.value }))
            }
          />
        </label>
        <label>
          Mật khẩu mới
          <input
            required
            type="password"
            minLength="6"
            value={password.newPassword}
            onChange={(e) =>
              setPassword((f) => ({ ...f, newPassword: e.target.value }))
            }
          />
        </label>
        <button className="button secondary" disabled={saving}>
          Cập nhật mật khẩu
        </button>
      </form>
    </div>
  );
}

export default App;
